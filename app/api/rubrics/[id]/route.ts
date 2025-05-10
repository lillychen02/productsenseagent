import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb'; // Adjusted path for nesting
import { ObjectId } from 'mongodb';

interface Rubric {
    _id?: ObjectId;
    // ... other rubric fields if needed for type consistency, or keep it minimal for DELETE
}

// DELETE handler to remove a specific rubric by ID
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 1. Check for Admin Secret
  const adminSecret = process.env.ADMIN_SECRET;
  const requestSecret = request.headers.get('X-Admin-Secret');

  if (!adminSecret) {
    console.error('ADMIN_SECRET is not configured on the server.');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (requestSecret !== adminSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  let mongoId;

  try {
    mongoId = new ObjectId(id);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid rubric ID format' }, { status: 400 });
  }

  try {
    const { db } = await connectToDatabase();
    const result = await db.collection<Rubric>('rubrics').deleteOne({ _id: mongoId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Rubric not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Rubric deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete rubric:', error);
    return NextResponse.json({ error: 'Failed to delete rubric' }, { status: 500 });
  }
}

// Optional: Add a GET handler here if you want to fetch a single rubric by ID
// export async function GET(request: Request, { params }: { params: { id: string } }) { ... }

// Optional: Add a PUT handler here if you want to update a single rubric by ID
// export async function PUT(request: Request, { params }: { params: { id: string } }) { ... } 