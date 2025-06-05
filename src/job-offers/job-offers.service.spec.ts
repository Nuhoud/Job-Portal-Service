import { Test, TestingModule } from '@nestjs/testing';
import { JobOffersService } from './job-offers.service';

describe('JobOffersService', () => {
  let service: JobOffersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobOffersService],
    }).compile();

    service = module.get<JobOffersService>(JobOffersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
