/**
 * @createTime 2015-01-05
 * @author louis.tru <louistru@live.com>
 * @copyright © 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('teide/touch/FileMappingEntity.js');

/**
 * @class teide.touch.Baidu
 * @extends teide.touch.FileMappingEntity
 */
Class('teide.touch.Baidu', teide.touch.FileMappingEntity, {
  
  /**
   * @constructor
   */
  Baidu: function(local_dir, config){
    this.FileMappingEntity(local_dir, config);
  }
  
});


