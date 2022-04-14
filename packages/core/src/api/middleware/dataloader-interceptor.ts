import {
    CallHandler,
    createParamDecorator,
    ExecutionContext,
    Injectable,
    InternalServerErrorException,
    NestInterceptor,
} from '@nestjs/common';
import { APP_INTERCEPTOR, ContextIdFactory, ModuleRef } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import DataLoader from 'dataloader';
import { Observable } from 'rxjs';

import { REQUEST_CONTEXT_KEY } from '../../common/constants';
import { parseContext } from '../common/parse-context';
import { RequestContext } from '../common/request-context';

// The following code is taken from https://github.com/krislefeber/nestjs-dataloader
// and modified to better integrate with Vendure.

/**
 * This interface will be used to generate the initial data loader.
 * The concrete implementation should be added as a provider to your module.
 */
export interface NestDataLoader<ID, Type> {
    /**
     * Should return a new instance of dataloader each time
     */
    generateDataLoader(ctx: RequestContext): DataLoader<ID, Type>;
}

/**
 * Context key where get loader function will be stored.
 * This class should be added to your module providers like so:
 * {
 *     provide: APP_INTERCEPTOR,
 *     useClass: DataLoaderInterceptor,
 * },
 */
const NEST_LOADER_CONTEXT_KEY = 'NEST_LOADER_CONTEXT_KEY';

@Injectable()
export class DataLoaderInterceptor implements NestInterceptor {
    constructor(private readonly moduleRef: ModuleRef) {}
    /**
     * @inheritdoc
     */
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const graphqlExecutionContext = GqlExecutionContext.create(context);
        const { isGraphQL, req } = parseContext(context);
        const request = req as any;
        const ctx = request[REQUEST_CONTEXT_KEY];
        if (request[NEST_LOADER_CONTEXT_KEY] === undefined) {
            request[NEST_LOADER_CONTEXT_KEY] = {
                contextId: ContextIdFactory.create(),
                getLoader: (type: string): Promise<NestDataLoader<any, any>> => {
                    if (request[type] === undefined) {
                        try {
                            request[type] = (async () => {
                                return (
                                    await this.moduleRef.resolve<NestDataLoader<any, any>>(
                                        type,
                                        request[NEST_LOADER_CONTEXT_KEY].contextId,
                                        { strict: false },
                                    )
                                ).generateDataLoader(ctx);
                            })();
                        } catch (e) {
                            throw new InternalServerErrorException(`The loader ${type} is not provided` + e);
                        }
                    }
                    return request[type];
                },
            };
        }
        return next.handle();
    }
}

/**
 * The decorator to be used within your graphql method.
 */
export const Loader = createParamDecorator(
    async (data: any, context: ExecutionContext & { [key: string]: any }) => {
        const { req } = parseContext(context);
        if ((req as any)[NEST_LOADER_CONTEXT_KEY] === undefined) {
            throw new InternalServerErrorException(`
            You should provide interceptor ${DataLoaderInterceptor.name} globally with ${APP_INTERCEPTOR}
          `);
        }
        return await (req as any)[NEST_LOADER_CONTEXT_KEY].getLoader(data);
    },
);
