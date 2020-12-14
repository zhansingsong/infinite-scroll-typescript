import React, { useEffect, useState } from 'react';
import _ from 'lodash';
import axios from 'axios';
import IS from './IS';
import {List, Spin, Button, Avatar, Typography} from 'antd';
import 'antd/dist/antd.css';
import logo from './logo.svg';
import './App.css';

type ListType = {
  id: string;
  title: string;
  desc: string;
  url: string;
  avatar: string;
  img: string;
  content: string;
};
function App() {
  const [listData, setListData] = useState<ListType[]>([]);
  const [pageCount, setPageCount] = useState<number>(0);
  const [hasMoreItems, setHasMoreItems] = useState<boolean>(false);
  const initState = () => {
    setListData([]);
  }
  useEffect(() => {
    setHasMoreItems(true);
  }, [])
  const loadItems = (page: number) => {
    console.log(page, 'page----------->')
    if(page === 5){
      console.log('vvv')
      setPageCount(p => p === -1 ? 0 : -1);
      setHasMoreItems(false);
      return;
    }
    axios({
      url: '/api/list',
      method: 'get',
    }).then((res) => {
      setListData(listData => [...listData, ...res.data.data])
    });
  };
  return (
    <div className="App">
      <Button type="primary" onClick={initState}>重新加载</Button>
      <IS
        // initialLoad
        // isReverse
        pageStart={pageCount}
        loadMore={loadItems}
        hasMore={hasMoreItems}
        useWindow={true}
        // getScrollParent={getContainer}
        loader={<Spin tip="正在加载中……" key="InfiniteScroll" />}
      >
        <List
            itemLayout="vertical"
            size="large"
            dataSource={listData}
            renderItem = {item => {
              return (
                <List.Item
                key={item.url}
                extra={
                  <img
                    width={200}
                    alt="logo"
                    src={item.img}
                  />
                }
              >
                <List.Item.Meta
                  avatar={<Avatar src={item.avatar} />}
                  title={<a href={item.url}>{item.title}</a>}
                  description={item.desc}
                />
                <Typography.Paragraph>
                  {item.content}
                </Typography.Paragraph>
              </List.Item>
              );
            }}
        >
        </List>
      </IS>
    </div>
  );
}

export default App;
