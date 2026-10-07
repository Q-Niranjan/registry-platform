import 'server-only';

import { NextRequest } from 'next/server';
import { callExistingBackend } from './callExistingBackend';
import type { RegisterRecord } from '@/features/register/types/register';
import type { SearchSuggestion } from '@openg2p/dashboard-widgets';

type DashboardRegister = {
  register_id?: string;
  register_mnemonic?: string;
  register_subject?: string;
  total_record_count?: number | string;
};

export async function fetchLiveRegisterCounts(
  req: NextRequest,
): Promise<Record<string, number>> {
  const payload = await callExistingBackend<DashboardRegister[] | { data?: DashboardRegister[] }>(
    req,
    '/register-metadata/get_dashboard_registers',
    {
      pagination_request: undefined,
      request_payload: {},
    },
  );

  const list = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: DashboardRegister[] })?.data)
      ? (payload as { data: DashboardRegister[] }).data
      : [];

  const counts: Record<string, number> = {};
  for (const reg of list) {
    const mnemonic = String(reg.register_mnemonic || '').trim();
    if (!mnemonic) continue;
    const n = Number(reg.total_record_count ?? 0);
    if (!Number.isFinite(n)) continue;
    counts[mnemonic] = n;
    counts[mnemonic.toLowerCase()] = n;
  }
  return counts;
}

export async function fetchLiveRegisterSummaries(
  req: NextRequest,
): Promise<DashboardRegister[]> {
  const payload = await callExistingBackend<DashboardRegister[] | { data?: DashboardRegister[] }>(
    req,
    '/register-data/get_register_summary_data',
    {
      pagination_request: undefined,
      request_payload: {},
    },
  );

  if (Array.isArray(payload)) return payload;
  if (Array.isArray((payload as { data?: DashboardRegister[] })?.data)) {
    return (payload as { data: DashboardRegister[] }).data;
  }
  return [];
}

export async function searchRegisterSuggestions(
  req: NextRequest,
  input: {
    query: string;
    registerMnemonic?: string;
    limit?: number;
  },
): Promise<SearchSuggestion[] | null> {
  const query = input.query.trim();
  if (!query) return [];

  const registers = await callExistingBackend<DashboardRegister[]>(
    req,
    '/register-metadata/get_dashboard_registers',
    {
      pagination_request: undefined,
      request_payload: {},
    },
  );

  const list = Array.isArray(registers) ? registers : [];
  if (!list.length) return null;

  const wanted = (input.registerMnemonic || 'all').toLowerCase();
  const targets =
    wanted === 'all'
      ? list.filter((r) => {
          const m = String(r.register_mnemonic || '').toLowerCase();
          return m === 'individual' || m === 'household';
        })
      : list.filter(
          (r) => String(r.register_mnemonic || '').toLowerCase() === wanted,
        );

  const searchTargets = targets.length
    ? targets
    : list.slice(0, 1);

  const limit = input.limit ?? 8;
  const suggestions: SearchSuggestion[] = [];

  for (const reg of searchTargets) {
    if (!reg.register_id) continue;
    const records = await callExistingBackend<RegisterRecord[]>(
      req,
      '/register-data/search_in_a_register',
      {
        pagination_request: {
          current_page: 1,
          page_size: limit,
          search_text: query,
        },
        request_payload: {
          register_id: reg.register_id,
        },
      },
    );

    if (!Array.isArray(records)) continue;

    const mnemonic = String(reg.register_mnemonic || 'individual').toLowerCase();
    const label =
      mnemonic === 'household'
        ? 'Households'
        : mnemonic === 'individual'
          ? 'Individuals'
          : String(reg.register_subject || reg.register_mnemonic || 'Records');

    for (const record of records) {
      suggestions.push({
        // Detail routes use internal_record_id; show functional id in the UI meta.
        id: record.internal_record_id || record.functional_record_id,
        name: record.record_name || record.functional_record_id || 'Record',
        meta:
          [
            record.functional_record_id,
            ...(record.display_fields || [])
              .slice(0, 2)
              .map((f) => f.value)
              .filter(Boolean),
          ]
            .filter(Boolean)
            .join(' · ') || label,
        register: mnemonic,
        registerLabel: label,
      });
      if (suggestions.length >= limit) return suggestions;
    }
  }

  return suggestions;
}

export async function fetchLiveIntakePending(req: NextRequest): Promise<number | null> {
  const payload = await callExistingBackend<{
    total_approval_pending_submissions?: number;
  }>(req, '/intake-form-data/get_intake_form_submissions_summary', {
    pagination_request: undefined,
    request_payload: {},
  });

  if (!payload) return null;
  const n = Number(payload.total_approval_pending_submissions);
  return Number.isFinite(n) ? n : null;
}

export async function fetchLiveTaskCount(req: NextRequest): Promise<number | null> {
  const payload = await callExistingBackend<{
    change_request_count?: number;
    intake_form_count?: number;
    data?: { change_request_count?: number; intake_form_count?: number };
  }>(req, '/awe/my_task_stats', {
    pagination_request: undefined,
    request_payload: {},
  });

  if (!payload) return null;
  const src = payload.data ?? payload;
  const total =
    Number(src.change_request_count ?? 0) + Number(src.intake_form_count ?? 0);
  return Number.isFinite(total) ? total : null;
}
