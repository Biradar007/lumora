import { NextResponse } from 'next/server';
// import { connectToDatabase, CounselingContact } from '@lumora/db';

export async function GET() {
  try {
    // await connectToDatabase();
    // const contacts = await CounselingContact.find({}).lean();
    // return NextResponse.json({ contacts });
  } catch (err) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}


