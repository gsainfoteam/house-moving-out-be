import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import type { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { LOGGABLE } from './decorator/loggable';

type AnyMethod = (...args: unknown[]) => unknown;

type InstanceWithMethods = {
  constructor: { name: string };
} & Record<string, unknown>;

@Injectable()
export class LoggerDecoratorRegister implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  onModuleInit() {
    return this.discoveryService
      .getProviders()
      .filter((wrapper) => wrapper.isDependencyTreeStatic())
      .filter((wrapper: InstanceWrapper) => {
        const metatype: unknown = wrapper.metatype;
        const instance: unknown = wrapper.instance;

        if (!instance || !metatype) {
          return false;
        }

        return Reflect.getMetadata(LOGGABLE, metatype);
      })
      .forEach((wrapper: InstanceWrapper) => {
        const instance: unknown = wrapper.instance;

        if (!instance || typeof instance !== 'object') {
          return;
        }

        const target = instance as InstanceWithMethods;

        this.metadataScanner
          .getAllMethodNames(target as object)
          .forEach((methodName) => {
            const originalMethod = target[methodName];

            if (typeof originalMethod !== 'function') {
              return;
            }

            const logger = new Logger(target.constructor.name);

            const wrapped: AnyMethod = function (
              this: unknown,
              ...args: unknown[]
            ): unknown {
              logger.log(`Before ${methodName}`);
              const now = Date.now();
              const result: unknown = (originalMethod as AnyMethod).apply(
                this,
                args,
              );

              if (result instanceof Promise) {
                return result.then((resolvedResult: unknown) => {
                  logger.log(`After ${methodName} +${Date.now() - now}ms`);
                  return resolvedResult;
                });
              }

              logger.log(`After ${methodName} +${Date.now() - now}ms`);
              return result;
            };

            target[methodName] = wrapped;
          });
      });
  }
}
