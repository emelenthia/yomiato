import { MAX_REFLECTION_LENGTH } from '../../shared/constants/limits';
import { ApplicationError } from '../../application/errors/application-error';
import type { ReflectionType } from '../entities/reading-entry';

export interface CompletionInput {
  reflection: string;
  noTakeaway: boolean;
}

export interface ValidatedCompletion {
  reflection: string;
  reflectionType: ReflectionType;
}

export function validateCompletion({
  reflection,
  noTakeaway,
}: CompletionInput): ValidatedCompletion {
  if (reflection.length > MAX_REFLECTION_LENGTH) {
    throw new ApplicationError('REFLECTION_TOO_LONG');
  }

  if (noTakeaway) {
    return {
      reflection: '',
      reflectionType: 'none',
    };
  }

  const normalizedReflection = reflection.trim();

  if (!normalizedReflection) {
    throw new ApplicationError('REFLECTION_REQUIRED');
  }

  return {
    reflection: normalizedReflection,
    reflectionType: 'impression',
  };
}
