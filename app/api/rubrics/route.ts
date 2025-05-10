// Interview Types & Rubrics
// While today we're only using one interview type (and one rubric), our design allows you 
// to register multiple rubrics (each keyed by a unique rubricId). When we roll out new 
// interview formats (e.g. Product Sense, Critical Thinking), we'll simply add their 
// rubric definitions and pass the appropriate rubricId to the scoring API.

import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

// Define the structure of a Rubric
interface ScoringDetail {
  '1': string;
  '2': string;
  '3': string;
  '4': string;
}

// Updated RubricDimension for the array structure
interface RubricDimension {
  dimension: string;
  description: string;
  subcriteria: string[];
  exemplar_response?: string | string[];
}

interface RoleVariantDetail {
  emphasized_dimensions: string[];
}

interface RoleVariants {
  zero_to_one_pm?: RoleVariantDetail;
  growth_pm?: RoleVariantDetail;
  consumer_pm?: RoleVariantDetail;
  [key: string]: RoleVariantDetail | undefined;
}

interface RubricMetadata {
  role_variants?: RoleVariants;
  minimum_bar?: {
    required_dimensions: string[];
    rule: string;
  }
}

// Updated RubricDefinition to match the new structure
interface RubricDefinition {
  scoring_scale: ScoringDetail;
  evaluation_criteria: RubricDimension[]; // Array of dimensions
  scoring_guide: { // Matches new field name
    "Strong Hire": string;
    "Hire": string;
    "Mixed": string;
    "No Hire": string;
    [key: string]: string; 
  };
  metadata?: RubricMetadata; // New optional metadata
}

// Updated Rubric interface to include optional systemPrompt
interface Rubric {
  _id?: ObjectId;
  name: string;
  definition: RubricDefinition;
  systemPrompt?: string; // Optional: Custom system prompt for this rubric/interview type
  createdAt?: Date;
  updatedAt?: Date;
}

// GET handler to fetch all rubrics
export async function GET(request: Request) {
  try {
    const { db } = await connectToDatabase();
    const rubrics = await db.collection<Rubric>('rubrics').find({}).toArray();
    return NextResponse.json({ rubrics }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch rubrics:', error);
    return NextResponse.json({ error: 'Failed to fetch rubrics' }, { status: 500 });
  }
}

// POST handler to create a new rubric
export async function POST(request: Request) {
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

  try {
    const body = await request.json();
    
    // Validate required fields (name, definition) and optional (systemPrompt)
    if (!body.name || typeof body.name !== 'string' || !body.definition) {
      return NextResponse.json({ error: 'Missing or invalid name or definition in request body' }, { status: 400 });
    }
    if (body.systemPrompt && typeof body.systemPrompt !== 'string') {
         return NextResponse.json({ error: 'Invalid systemPrompt field, must be a string if provided' }, { status: 400 });
    }

    // TODO: Add more detailed validation for body.definition structure against RubricDefinition if needed
    const { name, definition, systemPrompt } = body as { name: string; definition: RubricDefinition; systemPrompt?: string };

    const { db } = await connectToDatabase();
    const newRubric: Omit<Rubric, '_id'> = {
      name,
      definition,
      systemPrompt, // Include systemPrompt (will be undefined if not provided)
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection<Rubric>('rubrics').insertOne(newRubric as Rubric);

    if (!result.insertedId) {
        return NextResponse.json({ error: 'Failed to create rubric, no insertedId returned' }, { status: 500 });
    }
    
    const createdRubric = await db.collection<Rubric>('rubrics').findOne({ _id: result.insertedId });

    return NextResponse.json({ message: 'Rubric created successfully', rubric: createdRubric }, { status: 201 });
  } catch (error) {
    console.error('Failed to create rubric:', error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create rubric' }, { status: 500 });
  }
} 