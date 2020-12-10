const Mock = require('mockjs');
const { createProxyMiddleware } = require('http-proxy-middleware');
var data = Mock.mock({
  // 属性 list 的值是一个数组，其中含有 1 到 10 个元素
  'data|10-12': [{
      // 属性 id 是一个自增数，起始值为 1，每次增 1
      'id|+1': 1,
      'title': '@ctitle()',
      'desc': '@cparagraph',
      'url': '@url',
      'avatar': '@image("100x100", "@color", "@name")',
      'img': '@image("200x200", "@color", "@cname")',
      'content': '@cparagraph(40, 43)'
  }]
})
module.exports = function (app) {
  // app.use(
  //   '/api/**',
  //   createProxyMiddleware({
  //     target: 'http://10.143.54.107:3001',
  //     // target: 'http://10.153.54.107:3001',
  //     // target: 'https://wordlink.roadmapedu.com',
  //     // target: 'http://10.129.192.126',
  //     changeOrigin: true,
  //     pathRewrite: {
  //       // '^/api/': '/mock/149/api/', // rewrite path
  //     },
  //   })
  // );
  app.use(
    '/api/list',
    (req, res) => {
      res.send(data);
    }
  );
};
