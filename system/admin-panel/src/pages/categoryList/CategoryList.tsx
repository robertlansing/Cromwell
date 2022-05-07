import { gql } from '@apollo/client';
import { getBlockInstance, TPagedParams, TProductCategory, TProductCategoryFilter } from '@cromwell/core';
import { CList, getGraphQLClient, TCList } from '@cromwell/core-frontend';
import {
    AccountTreeOutlined as AccountTreeOutlinedIcon,
    List as ListIcon,
    UnfoldLess as UnfoldLessIcon,
    UnfoldMore as UnfoldMoreIcon,
} from '@mui/icons-material';
import { Button, Checkbox, IconButton, Skeleton, TextField, Tooltip } from '@mui/material';
import clsx from 'clsx';
import React, { useEffect, useRef, useState } from 'react';
import { connect, PropsType } from 'react-redux-ts';
import { useHistory } from 'react-router-dom';
import { debounce } from 'throttle-debounce';

import DeleteSelectedButton from '../../components/entity/entityTable/components/DeleteSelectedButton';
import SortBy, { TSortOption } from '../../components/entity/sort/Sort';
import { LoadingStatus } from '../../components/loadBox/LoadingStatus';
import ConfirmationModal from '../../components/modal/Confirmation';
import Pagination from '../../components/pagination/Pagination';
import { listPreloader } from '../../components/skeleton/SkeletonPreloader';
import { toast } from '../../components/toast/toast';
import { categoryPageInfo } from '../../constants/PageInfos';
import { useForceUpdate } from '../../helpers/forceUpdate';
import {
    countSelectedItems,
    getSelectedInput,
    resetSelected,
    toggleItemSelection,
    toggleSelectAll,
} from '../../redux/helpers';
import { TAppState } from '../../redux/store';
import commonStyles from '../../styles/common.module.scss';
import CategoryItem from './CategoryItem';
import styles from './CategoryList.module.scss';

export type ListItemProps = {
    handleDeleteBtnClick: (product: TProductCategory) => void;
    toggleSelection?: (data: TProductCategory) => void;
    displayType: 'tree' | 'list';
    embeddedView?: boolean;
}

const mapStateToProps = (state: TAppState) => {
    return {
        allSelected: state.allSelected,
    }
}

type TPropsType = PropsType<TAppState, {
    embeddedView?: boolean;
}, ReturnType<typeof mapStateToProps>>;


const CategoryList = (props: TPropsType) => {
    const client = getGraphQLClient();
    const [rootCategories, setRootCategories] = useState<TProductCategory[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [displayType, setDisplayType] = useState<'tree' | 'list'>('tree');
    const collapsedItemsRef = useRef<Record<string, boolean>>({});
    const deletedItemsRef = useRef<Record<string, boolean>>({});
    const forceUpdate = useForceUpdate();
    const [categoryToDelete, setCategoryToDelete] = useState<TProductCategory | null>(null);
    const history = useHistory();
    const listId = "Admin_ProductCategoryList";
    const filterInput = useRef<TProductCategoryFilter>({});
    const [deleteSelectedOpen, setDeleteSelectedOpen] = useState<boolean>(false);
    const totalElements = useRef<number | null>(null);
    const orderByRef = useRef<keyof TProductCategory | null>(null);
    const orderRef = useRef<'ASC' | 'DESC' | null>(null);

    const availableSorts: TSortOption<TProductCategory>[] = [
        {
            key: 'id',
            label: 'ID'
        },
        {
            key: 'name',
            label: 'Name'
        },
        {
            key: 'createDate',
            label: 'Created'
        },
    ]

    const getRootCategories = async () => {
        setIsLoading(true);
        try {
            const categories = await client.getRootCategories();
            if (categories?.elements && Array.isArray(categories?.elements)) {
                setRootCategories(categories.elements);
                totalElements.current = categories.pagedMeta?.totalElements;
            }
        } catch (e) {
            console.error(e);
        }
        setIsLoading(false);
    }

    useEffect(() => {
        getRootCategories();

        if (!props.embeddedView)
            resetSelected();
        return () => {
            if (!props.embeddedView)
                resetSelected();
        }
    }, []);

    const handleCollapseAll = () => {
        collapsedItemsRef.current['all'] = false;
        forceUpdate();
    }

    const handleExpandAll = () => {
        collapsedItemsRef.current['all'] = true;
        forceUpdate();
    }

    const handleDeleteBtnClick = (category: TProductCategory) => {
        setCategoryToDelete(category);
    }

    const handleDeleteCategory = async () => {
        if (categoryToDelete) {
            try {
                await client?.deleteProductCategory(categoryToDelete.id)
                deletedItemsRef.current[categoryToDelete.id] = true;
                toast.success('Category deleted');
            } catch (e) {
                console.error(e);
                toast.error('Failed to delete category');
            }
        }
        setCategoryToDelete(null);
        getRootCategories();
        updateList();
    }

    const handleCreate = () => {
        history.push(`${categoryPageInfo.baseRoute}/new`)
    }

    const handleChangeDisplayView = () => {
        if (displayType === 'list')
            setDisplayType('tree')
        else setDisplayType('list')
    }

    const handleFilterInput = debounce(400, () => {
        resetList();
    });

    const handleGetProductCategories = async (params: TPagedParams<TProductCategory>) => {
        if (!params) params = {};
        params.orderBy = orderByRef.current ?? 'id';
        params.order = orderRef.current ?? 'DESC';

        const data = await client?.getProductCategories({
            pagedParams: params,
            customFragment: gql`
                fragment ProductCategoryListFragment on ProductCategory {
                    id
                    slug
                    isEnabled
                    name
                    mainImage
                    children {
                        id
                        slug
                    }
                    parent {
                        id
                    }
                }
            `,
            customFragmentName: 'ProductCategoryListFragment',
            filterParams: filterInput.current,
        });
        if (data?.pagedMeta?.totalElements) {
            totalElements.current = data.pagedMeta?.totalElements;
        }
        return data;
    }

    const handleToggleItemSelection = (data: TProductCategory) => {
        toggleItemSelection(data.id);
    }

    const resetList = () => {
        totalElements.current = null;
        const list = getBlockInstance<TCList>(listId)?.getContentInstance();
        list?.clearState();
        list?.init();
    }

    const updateList = () => {
        totalElements.current = null;
        const list = getBlockInstance<TCList>(listId)?.getContentInstance();
        list?.updateData();
    }

    const handleToggleSelectAll = () => {
        toggleSelectAll()
    }

    const handleDeleteSelectedBtnClick = () => {
        if (countSelectedItems(totalElements.current) > 0)
            setDeleteSelectedOpen(true);
    }

    const handleDeleteSelected = async () => {
        setIsLoading(true);
        setRootCategories([]);
        totalElements.current = 0;
        try {
            const input = getSelectedInput();
            await client?.deleteManyProductCategories(input, filterInput.current);
            toast.success('Categories deleted');
        } catch (e) {
            console.error(e);
            toast.error('Failed to delete categories');
        }
        await getRootCategories();
        resetSelected();
        updateList();
        setDeleteSelectedOpen(false);
        setIsLoading(false);
    }

    const handleChangeOrder = (key: keyof TProductCategory, order: 'ASC' | 'DESC') => {
        orderByRef.current = key;
        orderRef.current = order;
        resetList();
        forceUpdate();
    }

    return (
        <div className={styles.CategoryList} >
            {!props.embeddedView && (
                <div className={styles.pageHeader}>
                    <h1 className={clsx(styles.pageTitle, commonStyles.pageTitle)}>Categories</h1>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <DeleteSelectedButton
                            style={{ marginRight: '10px' }}
                            onClick={handleDeleteSelectedBtnClick}
                            totalElements={totalElements.current}
                        />
                        <Button variant="contained"
                            size="small"
                            onClick={handleCreate}
                        >Add new</Button>
                    </div>
                </div>
            )}
            <div className={styles.listHeader}>
                <div className={styles.filter}>
                    <div className={commonStyles.center}>
                        {!props.embeddedView && (
                            <Tooltip title="Select all">
                                <Checkbox
                                    style={{ marginRight: '10px' }}
                                    checked={props.allSelected ?? false}
                                    onChange={handleToggleSelectAll}
                                />
                            </Tooltip>
                        )}
                    </div>
                    <Tooltip title={displayType === 'list' ? 'Tree view' : 'List view'}>
                        <IconButton
                            className={styles.actionBtn}
                            aria-label="Expand all"
                            onClick={handleChangeDisplayView}
                        >
                            {displayType === 'list' ? <AccountTreeOutlinedIcon /> : <ListIcon />}
                        </IconButton>
                    </Tooltip>
                    {displayType === 'tree' && (
                        <>
                            <Tooltip title="Expand all">
                                <IconButton
                                    className={styles.actionBtn}
                                    aria-label="Expand all"
                                    onClick={handleExpandAll}
                                >
                                    <UnfoldMoreIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Collapse all">
                                <IconButton
                                    className={styles.actionBtn}
                                    aria-label="Collapse all"
                                    onClick={handleCollapseAll}
                                >
                                    <UnfoldLessIcon />
                                </IconButton>
                            </Tooltip>
                        </>
                    )}
                    {displayType === 'list' && (
                        <TextField
                            className={styles.filterItem}
                            placeholder="Category name or id"
                            variant="standard"
                            onChange={(event) => {
                                filterInput.current.nameSearch = event.target.value;
                                handleFilterInput();
                            }}
                        />
                    )}
                </div>
                <div className={styles.pageActions}>
                    {displayType === 'list' && (
                        <SortBy<TProductCategory>
                            options={availableSorts}
                            onChange={handleChangeOrder}
                        />
                    )}
                </div>
            </div>
            {displayType === 'tree' && (
                <div className={styles.treeList}>
                    {isLoading && Array(5).fill(1).map((it, index) => {
                        return <Skeleton key={index} variant="text" height="20px" style={{ margin: '20px 20px 0 20px' }} />
                    })}
                    {rootCategories?.map(category => {
                        return (
                            <CategoryItem
                                key={category.id}
                                data={category}
                                collapsedItemsRef={collapsedItemsRef}
                                deletedItemsRef={deletedItemsRef}
                                listItemProps={{
                                    handleDeleteBtnClick,
                                    toggleSelection: handleToggleItemSelection,
                                    displayType,
                                    embeddedView: props.embeddedView,
                                }}
                            />
                        )
                    })}
                </div>
            )}
            {displayType === 'list' && (
                <CList<TProductCategory, ListItemProps>
                    className={styles.listWrapper}
                    id={listId}
                    ListItem={CategoryItem}
                    useAutoLoading
                    usePagination
                    listItemProps={{
                        handleDeleteBtnClick,
                        toggleSelection: handleToggleItemSelection,
                        displayType,
                        embeddedView: props.embeddedView,
                    }}
                    useQueryPagination={!props.embeddedView}
                    loader={handleGetProductCategories}
                    cssClasses={{
                        scrollBox: styles.list,
                        contentWrapper: styles.listContent,
                    }}
                    elements={{
                        pagination: Pagination,
                        preloader: listPreloader
                    }}
                />
            )}
            <ConfirmationModal
                open={Boolean(categoryToDelete)}
                onClose={() => setCategoryToDelete(null)}
                onConfirm={handleDeleteCategory}
                title={`Delete category ${categoryToDelete?.name ?? ''}?`}
            />
            <ConfirmationModal
                open={deleteSelectedOpen}
                onClose={() => setDeleteSelectedOpen(false)}
                onConfirm={handleDeleteSelected}
                title={`Delete ${countSelectedItems(totalElements.current)} item(s)?`}
                disabled={isLoading}
            />
            <LoadingStatus isActive={isLoading} />
        </div>
    )
}

export default connect(mapStateToProps)(CategoryList);