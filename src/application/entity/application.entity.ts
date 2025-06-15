import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongoose from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import {JobOffer} from '../../job-offers/entities/job-offer.entity';

export type ApplicationDocument = Application & Document;


// Embedded subdocuments schemas
@Schema({ _id: false })
export class Education {
  @Prop({ required: true })
  degree: string;

  @Prop({ required: true })
  field: string;

  @Prop({ required: true })
  university: string;

/*   @Prop({ required: true })
  startYear?: number; */

  @Prop()
  endYear?: number;

  @Prop()
  GPA?: number;
}

@Schema({ _id: false })
export class Experience {
  @Prop({ required: true })
  jobTitle: string;

  @Prop({ required: true })
  company: string;

  @Prop({ required: false })
  location?: string;

  @Prop({ default: false })
  isCurrent?: boolean;

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;

  @Prop()
  description?: string;
}

@Schema({ _id: false })
export class Certification {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  issuer: string;

  @Prop({ required: true })
  issueDate: Date;
}

@Schema({ _id: false })
export class Skill {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, min: 0, max: 100 })
  level: number;
}

@Schema({ _id: false })
export class Skills {
  @Prop({ type: [Skill], default: [] })
  technical_skills: Skill[];

  @Prop({ type: [Skill], default: [] })
  soft_skills: Skill[];
}

@Schema({ _id: false })
export class JobPreferences {
  @Prop({ type: [String], enum: ['عن بعد', 'في الشركة','مزيج'], required: true })
  workPlaceType: string[];
  
  @Prop({ type: [String], enum: ['دوام كامل', 'دوام جزئي', 'عقد', 'مستقل', 'تدريب'], required: true })
  jobType: string[];

  @Prop({ required: true })
  jobLocation: string;
}

@Schema({ _id: false })
export class Basic {
  @Prop({ enum: ['ذكر', 'أنثى'] })
  gender?: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop()
  location?: string;

  @Prop({ type: [String], default: [] })
  languages: string[];
}

@Schema({_id:false})
export class Goals {
  @Prop({ required: true })
  careerGoal: string;

  @Prop({ type: [String], default: [] })
  interests: string[];
}

@Schema({_id:false})
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ type: String })
  email?: string;

  @Prop({ type: String })
  mobile?: string;

  @Prop({ 
    type: Basic,
    validate: {
      validator: function(value) {
        // Only validate if role is 'user'
        return this.role !== 'user' || value != null;
      },
      message: 'Basic info is required for regular users'
    }
  })
  basic?: Basic;

  @Prop({ 
    type: [Education], 
    default: function() {
      return this.role === 'user' ? [] : undefined;
    }
  })
  education?: Education[];

  @Prop({ 
    type: [Experience], 
    default: function() {
      return this.role === 'user' ? [] : undefined;
    }
  })
  experiences?: Experience[];

  @Prop({ 
    type: [Certification], 
    default: function() {
      return this.role === 'user' ? [] : undefined;
    }
  })
  certifications?: Certification[];

  @Prop({ type: Skills })
  skills?: Skills;

  @Prop({ type: JobPreferences })
  jobPreferences?: JobPreferences;

  @Prop({ type: Goals })
  goals?: Goals;  

}


// -------------------- main Application schema -------------------------------
@Schema({ timestamps: true })
export class Application {
    @Prop({ type: mongoose.Schema.Types.ObjectId, auto: true })
    _id: Types.ObjectId;
    
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'JobOffer',required: true })
    jobOfferId: Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
    userId : Types.ObjectId;

    @Prop({ type: User , required: true })
    userSnap:User;

    @Prop({ type: String , enum: ['pending', 'reviewed', 'accepted', 'rejected'],default: 'pending'})
    status: string;

    @Prop({ type:String })
    employerNote?:string;

    @Prop({ type: Date, default: Date.now })
    postedAt: Date;
}
export const ApplicationSchema = SchemaFactory.createForClass(Application);

// Add indexes for better query performance
ApplicationSchema.index({ jobOfferId: 1 });
ApplicationSchema.index({ userId: 1 });
ApplicationSchema.index({ status: 1 });
ApplicationSchema.index({ postedAt: -1 });

ApplicationSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    delete ret.createdAt;
    delete ret.updatedAt;
    return ret;
  },
});