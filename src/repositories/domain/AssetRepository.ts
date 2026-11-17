import type { Substation, Feeder, Transformer, Pole, Conductor, Consumer } from '../../types/assets';
import { createRepository } from '../repositoryFactory';

export const assetRepositories = {
  substations: createRepository<Substation>('substations'),
  feeders: createRepository<Feeder>('feeders'),
  transformers: createRepository<Transformer>('transformers'),
  poles: createRepository<Pole>('poles'),
  conductors: createRepository<Conductor>('conductors'),
  consumers: createRepository<Consumer>('consumers'),
};
