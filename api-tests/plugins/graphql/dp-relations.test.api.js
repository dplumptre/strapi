'use strict';

// Helpers.
const { pick } = require('lodash/fp');
const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
let graphqlQuery;

// Utils
const selectFields = pick(['name']);

const documentModel = {
  attributes: {
    name: {
      type: 'richtext',
    },
  },
  singularName: 'document',
  pluralName: 'documents',
  displayName: 'Document',
  description: '',
  collectionName: '',
};

const labelModel = {
  attributes: {
    name: {
      type: 'richtext',
    },
    documents: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::document.document',
      targetAttribute: 'labels',
    },
  },
  singularName: 'label',
  pluralName: 'labels',
  displayName: 'Label',
  description: '',
  collectionName: '',
};

const labels = [{ name: 'label 1' }, { name: 'label 2' }];
const documents = ({ label: labels }) => {
  const labelIds = labels.map((label) => label.id);
  return [
    { name: 'document 1', labels: labelIds },
    { name: 'document 2', labels: labelIds },
  ];
};

describe('Test Graphql Relations with Draft and Publish enabled', () => {
  const data = {
    labels: [],
    documents: [],
  };

  beforeAll(async () => {
    await builder
      .addContentTypes([documentModel, labelModel])
      .addFixtures(labelModel.singularName, labels)
      .addFixtures(documentModel.singularName, documents)
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    graphqlQuery = (body) => {
      return rq({
        url: '/graphql',
        method: 'POST',
        body,
      });
    };
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Test relations features', () => {
    test('List labels', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            labels {
              data {
                documentId
                name
              }
            }
          }
        `,
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toMatchObject({
        data: {
          labels: {
            data: labels.map((label) => ({ id: expect.any(String), attributes: label })),
          },
        },
      });

      // assign for later use
      data.labels = data.labels.concat(res.body.data.labels.data);
    });

    test('List preview documents with labels', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            documents(status: DRAFT) {
              data {
                documentId
                name
                labels {
                  documentId
                  name
                }
              }
            }
          }
        `,
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toMatchObject({
        data: {
          documents: {
            data: expect.arrayContaining(data.documents),
          },
        },
      });

      // assign for later use
      data.documents = res.body.data.documents.data;
    });

    test('Publish document', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation publishDocument($documentId: ID!, $data: DocumentInput!) {
            updateDocument(documentId: $documentId, data: $data) {
              data {
                documentId
                name
                publishedAt
              }
            }
          }
        `,
        variables: {
          documentId: data.documents[0].documentId,
          data: {
            publishedAt: new Date().toISOString(),
          },
        },
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toMatchObject({
        data: {
          updateDocument: {
            data: {
              documentId: data.documents[0].documentId,
              name: data.documents[0].attributes.name,
              publishedAt: expect.any(String),
            },
          },
        },
      });
    });

    test('List labels with live documents', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            labels {
              data {
                documentId
                name
                documents {
                  documentId
                  name
                  publishedAt
                }
              }
            }
          }
        `,
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toMatchObject({
        data: {
          labels: {
            data: expect.arrayContaining(
              data.labels.map((label) => ({
                documentId: label.documentId,
                ...label,
                documents: expect.arrayContaining(
                  // Only the first document is published
                  data.documents.slice(0, 1).map((document) => ({
                    documentId: document.documentId,
                    ...selectFields(document),
                    publishedAt: expect.any(String),
                  }))
                ),
              }))
            ),
          },
        },
      });
    });

    test('List labels with preview documents', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            labels {
              data {
                documentId
                name
                documents(status: DRAFT) {
                  documentId
                  name
                }
              }
            }
          }
        `,
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toMatchObject({
        data: {
          labels: {
            data: expect.arrayContaining(
              data.labels.map((label) => ({
                ...label,
                documents: expect.arrayContaining(
                  // All documents should be returned, even if they are not published
                  data.documents.map((document) => ({
                    id: document.id,
                    ...selectFields(document),
                  }))
                ),
              }))
            ),
          },
        },
      });
    });
  });
});
