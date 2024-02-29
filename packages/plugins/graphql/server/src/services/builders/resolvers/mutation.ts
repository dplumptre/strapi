import { pick } from 'lodash/fp';
import { sanitize, validate } from '@strapi/utils';
import type { Schema } from '@strapi/types';
import type { Context } from '../../types';

const pickCreateArgs = pick(['params', 'data', 'files']);

// TODO: use document service
export default ({ strapi }: Context) => ({
  buildMutationsResolvers({ contentType }: { contentType: Schema.ContentType }) {
    const { uid } = contentType;

    return {
      async create(parent: any, args: any) {
        // todo[v4]: Might be interesting to generate dynamic yup schema to validate payloads with more complex checks (on top of graphql validation)
        const params = pickCreateArgs(args);

        // todo[v4]: Sanitize args to only keep params / data / files (or do it in the base resolver)
        return strapi.documents!(uid).create(params);
      },

      async update(parent: any, args: any) {
        const { documentId, data } = args;

        return strapi.documents!(uid).update(documentId, { data });
      },

      async delete(parent: any, args: any, ctx: any) {
        const { documentId, ...rest } = args;

        await validate.contentAPI.query(rest, contentType, {
          auth: ctx?.state?.auth,
        });

        const sanitizedQuery = await sanitize.contentAPI.query(rest, contentType, {
          auth: ctx?.state?.auth,
        });

        return strapi.documents!(uid).delete(documentId, sanitizedQuery);
      },
    };
  },
});
