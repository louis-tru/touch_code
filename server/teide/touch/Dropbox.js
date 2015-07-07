/**
 * @createTime 2015-06-01
 * @author louis.tru <louistru@live.com>
 * @copyright © 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('teide/touch/FileMappingEntity.js');

/**
 * @class teide.touch.MBaidu
 * @extends teide.touch.FileMappingEntity
 */
Class('teide.touch.Dropbox', teide.touch.FileMappingEntity, {
  
  /**
   * @constructor
   */
  Dropbox: function(local_dir, config){
    this.FileMappingEntity(local_dir, config);
  }
  
});


