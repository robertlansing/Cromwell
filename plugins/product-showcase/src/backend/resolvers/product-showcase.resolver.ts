import { TPagedList, TProduct } from '@cromwell/core';
import { getLogger, getPluginSettings, PagedProduct, ProductCategory, ProductRepository } from '@cromwell/core-backend';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Arg, Query, Resolver } from 'type-graphql';
import { getCustomRepository } from 'typeorm';

import { TSettings } from '../../types';

const logger = getLogger();

@Resolver(ProductCategory)
export default class PluginProductShowcaseResolver {
  private get productRepo() {
    return getCustomRepository(ProductRepository);
  }

  @Query(() => PagedProduct)
  async pluginProductShowcase(
    @Arg('slug', () => String, { nullable: true }) slug?: string,
  ): Promise<TPagedList<TProduct>> {
    logger.log('ProductShowcaseResolver::productShowcase slug:' + slug);
    const timestamp = Date.now();

    let products: TPagedList<TProduct> = {
      elements: [],
    };

    const settings = await getPluginSettings<TSettings>('@cromwell/plugin-product-showcase');
    const maxSize = settings?.size ?? 20;

    if (slug) {
      const product = await this.productRepo.getBySlug(slug, ['categories']);
      if (!product?.id) throw new HttpException('Product with slug ' + slug + ' was not found!', HttpStatus.NOT_FOUND);

      // Gather products from all related categories until reach limit (maxSize)
      for (const category of product.categories ?? []) {
        if (category?.id) {
          const categoryProducts = await this.productRepo.getProductsFromCategory(category.id, {
            pageSize: maxSize,
          });
          if (categoryProducts?.elements && products.elements) {
            for (const prod of categoryProducts.elements) {
              // Differnt categories may contain same products, we don't want to duplicate them
              if (products.elements.some((addedProd) => addedProd.id === prod.id)) continue;

              products.elements.push(prod);

              if (products.elements.length >= maxSize) break;
            }
          }
        }

        if (products.elements?.length && products.elements?.length >= maxSize) break;
      }

      if (products.elements && products.elements.length < maxSize) {
        (await this.productRepo.getProducts({ pageSize: maxSize }))?.elements?.forEach((prod) => {
          if (products.elements && products.elements.length < maxSize) {
            products.elements?.push(prod);
          }
        });
      }
    } else {
      products = await this.productRepo.getProducts({ pageSize: maxSize });
    }

    const timestamp2 = Date.now();
    logger.log('ProductShowcaseResolver::productShowcase time elapsed: ' + (timestamp2 - timestamp) + 'ms');

    return products;
  }
}
