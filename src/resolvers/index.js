import { GraphQLDateTime } from 'graphql-scalars';
import userResolvers from './user';
import messageResolvers from './message';

const customScalarResolver = {
  Date: GraphQLDateTime,
};

export default [customScalarResolver, userResolvers, messageResolvers];
