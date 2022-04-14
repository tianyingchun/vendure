import { Injectable } from '@nestjs/common';
import { ID } from '@vendure/common/lib/shared-types';
import DataLoader from 'dataloader';

import { ProductVariant } from '../../entity/index';
import { ProductVariantService } from '../../service/index';
import { RequestContext } from '../common/request-context';
import { NestDataLoader } from '../middleware/dataloader-interceptor';

@Injectable()
export class ProductVariantLoader implements NestDataLoader<string, ProductVariant> {
    constructor(private readonly productVariantService: ProductVariantService) {}

    generateDataLoader(ctx: RequestContext): DataLoader<string, ProductVariant> {
        return new DataLoader<string, ProductVariant>(
            keys =>
                this.productVariantService.findByIds(ctx, keys as ID[]).then(values => {
                    // console.log(
                    //     'ids',
                    //     values.map(v => v.id),
                    // );

                    // make sure the returned objects are in the same order as the one that came in
                    // also return zeros where no products are found
                    const orderedResults = keys.map(id => {
                        // tslint:disable-next-line:no-non-null-assertion
                        return values.find(r => r.id === id)!;
                    });
                    // console.log(
                    //     `orderedResults`,
                    //     orderedResults.map(r => r.id),
                    // );
                    return orderedResults;
                }),
            // {
            //     batchScheduleFn: callback => setTimeout(callback, 10),
            // },
        );
    }
}
