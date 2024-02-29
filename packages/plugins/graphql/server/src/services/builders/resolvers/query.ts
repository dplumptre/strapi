import { omit } from 'lodash/fp';
import { sanitize, validate } from '@strapi/utils';
import type { Schema } from '@strapi/types';
import type { Context } from '../../types';

// TODO: use document service
export default ({ strapi }: Context) => ({
  buildQueriesResolvers({ contentType }: { contentType: Schema.ContentType }) {
    const { uid } = contentType;

    return {
      async findMany(parent: any, args: any, ctx: any) {
        await validate.contentAPI.query(args, contentType, {
          auth: ctx?.state?.auth,
        });

        const sanitizedQuery = await sanitize.contentAPI.query(args, contentType, {
          auth: ctx?.state?.auth,
        });

        return strapi.documents!(uid).findMany(sanitizedQuery);
      },

      async findFirst(parent: any, args: any, ctx: any) {
        await validate.contentAPI.query(args, contentType, {
          auth: ctx?.state?.auth,
        });

        const sanitizedQuery = await sanitize.contentAPI.query(args, contentType, {
          auth: ctx?.state?.auth,
        });

        return strapi.documents!(uid).findFirst(sanitizedQuery);
      },

      async findOne(parent: any, args: any, ctx: any) {
        await validate.contentAPI.query(args, contentType, {
          auth: ctx?.state?.auth,
        });
        const sanitizedQuery = await sanitize.contentAPI.query(args, contentType, {
          auth: ctx?.state?.auth,
        });

        return strapi.documents!(uid).findOne(
          args.documentId,
          omit(['id', 'documentId'], sanitizedQuery)
        );
      },
    };
  },
});
