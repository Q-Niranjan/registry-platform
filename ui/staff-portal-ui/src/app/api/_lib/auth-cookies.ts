import { NextResponse } from 'next/server';

/** Pass through a JSON body from the backend without cookie domain rewriting. */
export async function jsonResponseFromBackend(source: Response): Promise<NextResponse> {
    const data = await source.json();
    return NextResponse.json(data, { status: source.status });
}
