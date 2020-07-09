import React from 'react';
import { BasePageNames, CromwellPageType, CromwellPageCoreProps } from "@cromwell/core";
import { getStoreItem, setStoreItem } from "@cromwell/core";
//@ts-ignore
import { importDynamicPage } from '.cromwell/imports/imports.gen';
import { checkCMSConfig } from '../helpers/checkCMSConfig';
checkCMSConfig();


export const getPage = (pageName: BasePageNames | string): CromwellPageType => {
    const cmsconfig = getStoreItem('cmsconfig');
    if (!cmsconfig || !cmsconfig.themeName) {
        console.log('cmsconfig', cmsconfig)
        throw new Error('getPage !cmsconfig.themeName');
    }

    const Page: any = importDynamicPage(pageName);

    return function (props: CromwellPageCoreProps): JSX.Element {
        const { pluginsData, pageConfig, appCustomConfig, childStaticProps, ...restProps } = props;
        setStoreItem('pluginsData', pluginsData);
        setStoreItem('pageConfig', pageConfig);
        setStoreItem('appCustomConfig', appCustomConfig);

        // console.log('CromwellPageCoreProps pageName', pageName, 'props', props);
        return (
            <Page {...childStaticProps} {...restProps} />
        )
    }
}