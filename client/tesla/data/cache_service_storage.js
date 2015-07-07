/**
 * 缓存数据服务存储接口
 * @interface tesla.data.CacheDataServiceStorage
 */

// var data = {
//     cache_ver: 'xxx',
//     cache: {
//         "user.username": {
//             "all": "楚学文",
//             "ver": "h4xaa"
//         },
//         "card.cards": {
//             "all": {
//                 "30153_ef3ff": {
//                     "cid": 9130
//                 },
//                 "51053_ef3ff": {
//                     "cid": 9133
//                 },
//                 "56053_ef3ff": {
//                     "cid": 9172
//                 }
//             },
//             "ver": 139,
//             "is_table": 1
//         }
//     },
//     data: null
// };

$class('tesla.data.CacheServiceStorage', {

  /**
   * 通过名称读取数据
   * @param  {String} name
   * @return {Object}
   */    
  read: function(){ },

  /**
   * 通过名称写入数据
   * @param {String} name
   * @param {Object} data 
   */
  write: function(){ },

  /**
   * 通过名称删除数据
   * @param {String} name
   */
  remove: function(){ },

  /*
   * 获取缓存总版本号
   * @return {String}
   */
  version: function(){ },

  /*
   * 获取子版本号字典
   * @return {Object}
   */
  subVersionList: function(){ },

});
