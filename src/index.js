import 'dotenv/config';
import cors from 'cors';
import http from 'http';
import jwt from 'jsonwebtoken';
import express from 'express';
import { ApolloServer, AuthenticationError } from 'apollo-server-express';

import schema from './schema';
import resolvers from './resolvers';
import models, { sequelize } from './models';

async function startServer() {
  const app = express();
  app.use(cors());

  const getMe = async (req) => {
    const token = req.headers['x-token'];

    if (token) {
      try {
        return await jwt.verify(token, process.env.SECRET);
      } catch (e) {
        throw new AuthenticationError('Your session expired. Sign in again.');
      }
    }
  };

  const apolloServer = new ApolloServer({
    typeDefs: schema,
    resolvers,
    formatError: (error) => {
      // remove the internal sequelize error message
      // leave only the important validation error
      const message = error.message
        .replace('SequelizeValidationError: ', '')
        .replace('Validation error: ', '');

      return {
        ...error,
        message,
      };
    },
    context: async ({ req, connection }) => {
      if (connection) {
        return {
          models,
        };
      }

      if (req) {
        const me = await getMe(req);

        return {
          models,
          me,
          secret: process.env.SECRET,
        };
      }
    },
  });

  await apolloServer.start();

  apolloServer.applyMiddleware({ app, path: '/graphql' });

  const httpServer = http.createServer(app);

  const eraseDatabaseOnSync = true;

  sequelize.sync({ force: eraseDatabaseOnSync }).then(async () => {
    if (eraseDatabaseOnSync) {
      createUsersWithMessages(new Date());
    }

    httpServer.listen({ port: 8000 }, () => {
      console.log('Apollo Server on http://localhost:8000/graphql');
    });
  });

  // * Database Seeding * //
  const createUsersWithMessages = async (date) => {
    await models.User.create(
      {
        username: 'rwieruch',
        email: 'hello@robin.com',
        password: 'rwieruch',
        role: 'ADMIN',
        messages: [
          {
            text: 'Published the Road to learn React',
            createdAt: date.setSeconds(date.getSeconds() + 1),
          },
        ],
      },
      {
        include: [models.Message],
      }
    );

    await models.User.create(
      {
        username: 'ddavids',
        email: 'hello@david.com',
        password: 'ddavids',
        messages: [
          {
            text: 'Happy to release ...',
            createdAt: date.setSeconds(date.getSeconds() + 1),
          },
          {
            text: 'Published a complete ...',
            createdAt: date.setSeconds(date.getSeconds() + 1),
          },
        ],
      },
      {
        include: [models.Message],
      }
    );
  };
}

startServer();
