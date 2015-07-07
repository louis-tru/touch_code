
include('tesla/gui/scroll_view.js');
include('tesla/gui/native_html5.js');
include('test/test_tesla_scroll_view.vx');

function init(self) {
  
}

$class('test.MainViewport', tesla.gui.NH5WebPanel, {

  MainViewport: function(tag) {
    this.NH5WebPanel(tag);
    this.$on('loadview', init);
  },
  
  m_scroll_handle: function() {
    // console.log('OK');
  },
  
  m_click_handle: function(){
    this.call('test', ['ok']);
  },
  
  m_reload_handle: function(){
    location.reload();
  },
  
});
