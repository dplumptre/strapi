import _ from 'lodash';
import { yup } from '@strapi/utils';
import type { Strapi, Common, Schema } from '@strapi/types';

import { removeNamespace } from '../../registries/namespace';
import { validateModule } from './validation';

interface LifecyclesState {
  bootstrap?: boolean;
  register?: boolean;
  destroy?: boolean;
}

export interface RawModule {
  config?: Record<string, unknown>;
  routes?: Common.Module['routes'];
  controllers?: Common.Module['controllers'];
  services?: Common.Module['services'];
  contentTypes?: Common.Module['contentTypes'];
  policies?: Common.Module['policies'];
  middlewares?: Common.Module['middlewares'];
  bootstrap?: (params: { strapi: Strapi }) => Promise<void>;
  register?: (params: { strapi: Strapi }) => Promise<void>;
  destroy?: (params: { strapi: Strapi }) => Promise<void>;
}

export interface Module {
  bootstrap: () => Promise<void>;
  register: () => Promise<void>;
  destroy: () => Promise<void>;
  load: () => void;
  routes: Common.Module['routes'];
  config: (path: string, defaultValue?: unknown) => unknown;
  contentType: (ctName: Common.UID.ContentType) => Schema.ContentType;
  contentTypes: Record<string, Schema.ContentType>;
  service: (serviceName: Common.UID.Service) => Common.Service;
  services: Record<string, Common.Service>;
  policy: (policyName: Common.UID.Policy) => Common.Policy;
  policies: Record<string, Common.Policy>;
  middleware: (middlewareName: Common.UID.Middleware) => Common.Middleware;
  middlewares: Record<string, Common.Middleware>;
  controller: (controllerName: Common.UID.Controller) => Common.Controller;
  controllers: Record<string, Common.Controller>;
}

// Convert uids to config dot-delimited format and namespace them into 'config'
// to avoid conflicts with Strapi configs.
// For example, an api named "rest" will be found in config.get('config.rest')
const uidToPath = (uid: string) => `configs.${uid.replace('::', '.')}`;

// Removes the namespace from a map with keys prefixed with a namespace
const removeNamespacedKeys = <T extends Record<string, unknown>>(map: T, namespace: string) => {
  return _.mapKeys(map, (value, key) => removeNamespace(key, namespace));
};

const defaultModule = {
  config: {},
  routes: [],
  controllers: {},
  services: {},
  contentTypes: {},
  policies: {},
  middlewares: {},
};

export const createModule = (namespace: string, rawModule: RawModule, strapi: Strapi): Module => {
  _.defaults(rawModule, defaultModule);

  try {
    validateModule(rawModule);
  } catch (e) {
    if (e instanceof yup.ValidationError) {
      throw new Error(`strapi-server.js is invalid for '${namespace}'.\n${e.errors.join('\n')}`);
    }
  }

  const called: LifecyclesState = {};
  return {
    async bootstrap() {
      if (called.bootstrap) {
        throw new Error(`Bootstrap for ${namespace} has already been called`);
      }
      called.bootstrap = true;
      await (rawModule.bootstrap && rawModule.bootstrap({ strapi }));
    },
    async register() {
      if (called.register) {
        throw new Error(`Register for ${namespace} has already been called`);
      }
      called.register = true;
      await (rawModule.register && rawModule.register({ strapi }));
    },
    async destroy() {
      if (called.destroy) {
        throw new Error(`Destroy for ${namespace} has already been called`);
      }
      called.destroy = true;
      await (rawModule.destroy && rawModule.destroy({ strapi }));
    },
    load() {
      strapi.get('content-types').add(namespace, rawModule.contentTypes);
      strapi.get('services').add(namespace, rawModule.services);
      strapi.get('policies').add(namespace, rawModule.policies);
      strapi.get('middlewares').add(namespace, rawModule.middlewares);
      strapi.get('controllers').add(namespace, rawModule.controllers);
      strapi.get('config').set(uidToPath(namespace), rawModule.config);
    },
    get routes() {
      return rawModule.routes ?? {};
    },
    config(path: string, defaultValue: unknown) {
      return strapi.get('config').get(`${uidToPath(namespace)}.${path}`, defaultValue);
    },
    contentType(ctName: Common.UID.ContentType) {
      return strapi.get('content-types').get(`${namespace}.${ctName}`);
    },
    get contentTypes() {
      const contentTypes = strapi.get('content-types').getAll(namespace);
      return removeNamespacedKeys(contentTypes, namespace);
    },
    service(serviceName: Common.UID.Service) {
      return strapi.get('services').get(`${namespace}.${serviceName}`);
    },
    get services() {
      const services = strapi.get('services').getAll(namespace);
      return removeNamespacedKeys(services, namespace);
    },
    policy(policyName: Common.UID.Policy) {
      return strapi.get('policies').get(`${namespace}.${policyName}`);
    },
    get policies() {
      const policies = strapi.get('policies').getAll(namespace);
      return removeNamespacedKeys(policies, namespace);
    },
    middleware(middlewareName: Common.UID.Middleware) {
      return strapi.get('middlewares').get(`${namespace}.${middlewareName}`);
    },
    get middlewares() {
      const middlewares = strapi.get('middlewares').getAll(namespace);
      return removeNamespacedKeys(middlewares, namespace);
    },
    controller(controllerName: Common.UID.Controller) {
      return strapi.get('controllers').get(`${namespace}.${controllerName}`);
    },
    get controllers() {
      const controllers = strapi.get('controllers').getAll(namespace);
      return removeNamespacedKeys(controllers, namespace);
    },
  };
};
