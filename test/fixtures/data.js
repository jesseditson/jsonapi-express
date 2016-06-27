module.exports = {
  allThings: {
    data: [
      { id: 1, name: 'foo' },
      { id: 2, name: 'biz' }
    ],
    included: {
      stuffs: [
        {id: 1, title: 'foo', thing_id: 1},
        {id: 2, title: 'bar', thing_id: 1},
        {id: 3, title: 'baz', thing_id: 2}
      ]
    }
  },
  stuffIds: {
    data: [
      { id : 1 },
      { id : 2 },
      { id : 3 }
    ],
    defaults: {
      thing_id: 1
    }
  },
  allStuffs: {
    data: [
      { id: 1, title: 'foo', thing_id: null }
    ]
  },
  articles: [
    { id: 1, title: 'JSON API paints my bikeshed!', creator_id: 1 }
  ],
  users_articles: [
    { user_id: 1, article_id: 1 },
    { user_id: 2, article_id: 1 }
  ],
  users: [
    { id: 1, name: 'Yehuda Katz' },
    { id: 2, name: 'DHH' },
    { id: 3, name: 'Jesse Ditson' }
  ],
  comments: [
    { id: 1, content: 'first', article_id: 1, user_id: 3 }
  ]
}
