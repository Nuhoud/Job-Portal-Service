import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongoose from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type JobOfferDocument = JobOffer & Document;

// Embedded subdocument for salary range
@Schema({ _id: false })
export class SalaryRange {
  @Prop({ required: true, min: 0 })
  min: number;

  @Prop({ required: true, min: 0 })
  max: number;

  @Prop({ 
    required: true,
    enum: ['USD', 'EUR', 'SYP'],
    default: 'USD'
  })
  currency: string;
}

// Main JobOffer Schema
@Schema({ timestamps: true })
export class JobOffer {
  @Prop({ type: mongoose.Schema.Types.ObjectId, auto: true })
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ 
    type: [String],
    enum: ['Entry Level', 'Intership', 'Mid Level', 'Senior Level', 'Associate', 'Dirctor', 'Executive'],
    default: []
  })
  experienceLevel: string[];

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
  employerId: Types.ObjectId;

  @Prop({ required: true, enum: ['عن بعد', 'في الشركة','مزيج'], default: 'عن بعد'})
  workPlaceType: string;

  @Prop({ required: true, enum: ['دوام كامل', 'دوام جزئي', 'عقد', 'مستقل', 'تدريب'], default: 'دوام كامل'})
  jobType: string;

  @Prop({ required: true, trim: true })
  jobLocation: string;

  @Prop({ required: true })
  description: string;

  @Prop({ 
    type: [String], 
    required: true,
    validate: {
      validator: function(requirements: string[]) {
        return requirements && requirements.length > 0;
      },
      message: 'At least one requirement is needed'
    }
  })
  requirements: string[];

  @Prop({ type: SalaryRange, required: true })
  salaryRange: SalaryRange;

  @Prop({ type: Date, default: Date.now })
  postedAt: Date;

  @Prop({ 
    type: Date, 
    required: true,
    validate: {
      validator: function(deadline: Date) {
        return deadline > new Date();
      },
      message: 'Deadline must be in the future'
    }
  })
  deadline: Date;

  @Prop({ 
    required: true,
    enum: ['active', 'closed', 'expired', 'draft'],
    default: 'active'
  })
  status: string;

  // Additional useful fields
  @Prop({ 
    type: Number, 
    default: 0,
    min: 0
  })
  applicationsCount: number;

  @Prop({ 
    type: [String],
    default: []
  })
  skillsRequired: string[];

  @Prop({ 
    type: Boolean, 
    default: true 
  })
  isActive: boolean;
}

export const JobOfferSchema = SchemaFactory.createForClass(JobOffer);

// Add indexes for better query performance
JobOfferSchema.index({ employerId: 1 });
JobOfferSchema.index({ status: 1 });
JobOfferSchema.index({ workPlaceType: 1 });
JobOfferSchema.index({ jobType: 1 });
JobOfferSchema.index({ jobLocation: 1 });
JobOfferSchema.index({ postedAt: -1 });
JobOfferSchema.index({ deadline: 1 });
JobOfferSchema.index({ 'salaryRange.min': 1, 'salaryRange.max': 1 });
JobOfferSchema.index({ skillsRequired: 1 });
JobOfferSchema.index({ experienceLevel: 1 });

// Compound indexes for common queries
JobOfferSchema.index({ status: 1, postedAt: -1 });
JobOfferSchema.index({ workPlaceType: 1, jobType: 1 });
JobOfferSchema.index({ jobLocation: 1, status: 1 });

// Pre-save middleware to update status based on deadline
JobOfferSchema.pre('save', function() {
  if (this.deadline < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
});

// Virtual for checking if job is expired
JobOfferSchema.virtual('isExpired').get(function() {
  return this.deadline < new Date();
});

// Virtual for days remaining
JobOfferSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const deadline = new Date(this.deadline);
  const diffTime = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});


// Method to increment applications count
JobOfferSchema.methods.incrementApplications = function() {
  this.applicationsCount += 1;
  return this.save();
};

// Static method to find active jobs
JobOfferSchema.statics.findActive = function() {
  return this.find({ 
    status: 'active', 
    deadline: { $gt: new Date() },
    isActive: true 
  });
};

// Static method to find jobs by location
JobOfferSchema.statics.findByLocation = function(location: string) {
  return this.find({ 
    jobLocation: new RegExp(location, 'i'),
    status: 'active',
    isActive: true 
  });
};

// Transform output to exclude sensitive data if needed
JobOfferSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

// Export embedded schema for potential reuse
export const SalaryRangeSchema = SchemaFactory.createForClass(SalaryRange);