import { Schema, model, models, Types } from 'mongoose';
import { Rubric, RubricDefinition, ScoringDetail, RubricDimensionDefinition, RoleVariants, RubricMetadata } from '@/types';

// Sub-schemas to build up RubricDefinition
const ScoringDetailSchema = new Schema<ScoringDetail>(
  { 
    '1': { type: String, required: true },
    '2': { type: String, required: true },
    '3': { type: String, required: true },
    '4': { type: String, required: true },
  },
  { _id: false }
);

const RubricDimensionDefinitionSchema = new Schema<RubricDimensionDefinition>(
  {
    dimension: { type: String, required: true },
    description: { type: String, required: true },
    subcriteria: { type: [String], required: true },
    exemplar_response: Schema.Types.Mixed, // Can be string or string[]
  },
  { _id: false }
);

const RoleVariantDetailSchema = new Schema({ // Not using generic <RoleVariantDetail> due to dynamic keys
    emphasized_dimensions: { type: [String], required: true },
}, { _id: false });

const RoleVariantsSchema = new Schema<RoleVariants>(
  {
    zero_to_one_pm: RoleVariantDetailSchema,
    growth_pm: RoleVariantDetailSchema,
    consumer_pm: RoleVariantDetailSchema,
    // Additional role variants can be added here if they become fixed
  },
  { _id: false, strict: false } // strict: false to allow dynamic keys not defined in schema
);

const RubricMetadataSchema = new Schema<RubricMetadata>(
  {
    role_variants: RoleVariantsSchema,
    minimum_bar: {
      required_dimensions: [String],
      rule: String,
    },
  },
  { _id: false }
);

const RubricDefinitionSchema = new Schema<RubricDefinition>(
  {
    scoring_scale: { type: ScoringDetailSchema, required: true },
    evaluation_criteria: {
      type: [RubricDimensionDefinitionSchema],
      required: true,
    },
    scoring_guide: {
      type: Map,
      of: String,
      required: true,
    },
    metadata: RubricMetadataSchema,
  },
  { _id: false }
);

const RubricSchema = new Schema<Rubric>(
  {
    name: { type: String, required: true },
    definition: { type: RubricDefinitionSchema, required: true },
    systemPrompt: String,
  },
  { timestamps: true } // Adds createdAt and updatedAt
);

// Prevent model overwrite in Next.js hot reloading
export const RubricModel = models.Rubric || model<Rubric>('Rubric', RubricSchema); 