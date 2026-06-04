import { SectionConfig } from '../../../types';
import { UseBaseWidgetOptions } from '../../../hooks/useBaseWidget';
import { SectionMode } from '../../SectionsContainer';

export interface SectionChanges {
  section_id?: string;
  section_register_id?: string;
  records: unknown[];
  files?: unknown[];
  image?: File | null;
}

export interface SectionRendererProps {
  section: SectionConfig;
  dataSourceRequestHandler?: UseBaseWidgetOptions['dataSourceRequestHandler'];
  schemaData?: UseBaseWidgetOptions['schemaData'];
  onValueChange?: UseBaseWidgetOptions['onValueChange'];
  gridColumnSpan?: number;
  onSectionSave?: (changes: SectionChanges) => Promise<void> | void;
  hideEditButton?: boolean;
  mode?: SectionMode;
  namespace?: string;
  changeRequestType?: 'new' | 'old';
  showChangeRequestLabel?: boolean;
  dbSectionId?: string;
  sectionRegisterId?: string;
  onSectionDirtyChange?: (sectionId: string, isDirty: boolean) => void;
  sectionIndex?: number;
  sectionCount?: number;
  expandedSectionIndex?: number | null;
  onExpandSection?: (index: number) => void;
  onSectionSaveSuccess?: (index: number) => void;
  onPreviousSection?: (index: number) => void;
  isDraft?: boolean;
  isAccessible?: boolean;
  onEditModeChange?: (sectionId: string, editing: boolean) => void;
  forceExitEdit?: boolean;
}
