import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { createError, createErrorResponse } from '@/lib/types/errors'
import { pdfStore } from '@/lib/pdfStore'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        createErrorResponse([
          {
            field: 'server',
            message: 'Session ID is required',
            type: 'missing_session_id',
          },
        ]),
        { status: 500 }
      )
    }

    const fileId = params.id
    const key = `${sessionId}-${fileId}`
    const pdfFilePath = join(tmpdir(), `resume-${key}.pdf`)

    // Check in-memory first (Vercel)
    let pdfBuffer: Buffer
    if (pdfStore.has(key)) {
      pdfBuffer = pdfStore.get(key)!
      pdfStore.delete(key)
    } else {
      try {
        pdfBuffer = await readFile(pdfFilePath)
      } catch (error) {
        console.error('PDF file not found', error)
        return NextResponse.json(
          createErrorResponse([
            {
              field: 'server',
              message: 'PDF file not found',
              type: 'read_pdf',
            },
          ]),
          { status: 500 }
        )
      }
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="resume.pdf"',
      },
    })
  } catch (error) {
    const serverError = createError('server', 'PDF file not found', 'read_pdf')
    return NextResponse.json(createErrorResponse([serverError]), {
      status: 500,
    })
  }
}
