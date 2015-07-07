/**
 * @createTime 2015-01-05
 * @author louis.tru <louistru@live.com>
 * @copyright © 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('teide/touch/RevisionControlProtocol.js');

/**
 * @class teide.touch.GIT
 * @extends teide.touch.RevisionControlProtocol
 */
Class('teide.touch.GIT', teide.touch.RevisionControlProtocol, {
  
  /**
   * @constructor
   */
  GIT: function(local_dir, config){
    this.RevisionControlProtocol(local_dir, config);
  },
  
});


