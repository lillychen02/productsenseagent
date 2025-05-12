// Interview Types & Rubrics
// While today we're only using one interview type (and one rubric), our design allows you 
// to register multiple rubrics (each keyed by a unique rubricId). When we roll out new 
// interview formats (e.g. Product Sense, Critical Thinking), we'll simply add their 
// rubric definitions and pass the appropriate rubricId to the scoring API.

import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
// Importing all necessary rubric-related types from the central types file
import type { 
    Rubric, 
    RubricDefinition, 
    // ScoringDetail, // Not directly used in handlers, part of RubricDefinition
    // RubricDimensionDefinition, // Part of RubricDefinition
    // RoleVariantDetail, // Part of RubricDefinition
    // RoleVariants, // Part of RubricDefinition
    // RubricMetadata // Part of RubricDefinition
} from '../../../types/index.ts';

type RubricDocument = Rubric;

// GET handler to fetch all rubrics
export async function GET(request: Request) {
  console.log('GET /api/rubrics called');
  try {
    console.time('rubricApiConnectDb');
    const { db } = await connectToDatabase();
    console.timeEnd('rubricApiConnectDb');

    console.time('rubricApiFetchRubrics');
    const rubrics = await db.collection<RubricDocument>('rubrics').find({}).toArray();
    console.timeEnd('rubricApiFetchRubrics');

    console.log(`Found ${rubrics.length} rubrics.`);
    return NextResponse.json({ rubrics }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch rubrics:', error);
    return NextResponse.json({ error: 'Failed to fetch rubrics' }, { status: 500 });
  }
}

// POST handler to create a new rubric
export async function POST(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  const requestSecret = request.headers.get('X-Admin-Secret');

  if (!adminSecret) {
    console.error('ADMIN_SECRET is not configured on the server.');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
  if (requestSecret !== adminSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    if (!body.name || typeof body.name !== 'string' || !body.definition) {
      return NextResponse.json({ error: 'Missing or invalid name or definition in request body' }, { status: 400 });
    }
    if (body.systemPrompt && typeof body.systemPrompt !== 'string') {
         return NextResponse.json({ error: 'Invalid systemPrompt field, must be a string if provided' }, { status: 400 });
    }

    const { name, definition, systemPrompt } = body as { name: string; definition: RubricDefinition; systemPrompt?: string };

    const { db } = await connectToDatabase();
    const newRubric: Omit<RubricDocument, '_id'> = {
      name,
      definition,
      systemPrompt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection<RubricDocument>('rubrics').insertOne(newRubric as RubricDocument);

    if (!result.insertedId) {
        return NextResponse.json({ error: 'Failed to create rubric, no insertedId returned' }, { status: 500 });
    }
    
    const createdRubric = await db.collection<RubricDocument>('rubrics').findOne({ _id: result.insertedId });

    return NextResponse.json({ message: 'Rubric created successfully', rubric: createdRubric }, { status: 201 });
  } catch (error) {
    console.error('Failed to create rubric:', error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create rubric' }, { status: 500 });
  }
} 