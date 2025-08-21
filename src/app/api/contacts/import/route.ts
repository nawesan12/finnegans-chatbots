import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { getUserIdFromToken } from '@/lib/auth';
import formidable, { File } from 'formidable';
import { promises as fs } from 'fs';
import { parse } from 'csv-parse/sync';
import { Writable } from 'stream';

const prisma = new PrismaClient();

interface ContactToCreate {
  name: string;
  phone: string;
}

async function parseFormData(req: NextRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
    const readable = req.body as ReadableStream<Uint8Array>;
    const body = new formidable.IncomingForm();
    return new Promise((resolve, reject) => {
        readable.pipeTo(new WritableStream({
            write(chunk) {
                body.write(chunk);
            },
            close() {
                body.parse(req as Request, (err, fields, files) => {
                    if(err) reject(err);
                    else resolve({fields, files});
                });
            },
            abort(err) {
                reject(err);
            }
        }));
    });
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { files } = await parseFormData(request);
    const file = files.file as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileContent = await fs.readFile(file.filepath, 'utf-8');
    let contactsToCreate: ContactToCreate[] = [];

    if (file.mimetype === 'application/json') {
      contactsToCreate = JSON.parse(fileContent);
    } else if (file.mimetype === 'text/csv') {
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
      });
      contactsToCreate = records;
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const createdContacts = await prisma.$transaction(
      contactsToCreate.map((contact) =>
        prisma.contact.create({
          data: {
            name: contact.name,
            phone: contact.phone,
            userId: userId,
          },
        })
      )
    );

    return NextResponse.json({ message: 'Contacts imported successfully', count: createdContacts.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
