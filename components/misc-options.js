(function(){
  var ref$, send_feature_enabled, send_feature_disabled;
  ref$ = require('libs_backend/logging_enabled_utils'), send_feature_enabled = ref$.send_feature_enabled, send_feature_disabled = ref$.send_feature_disabled;
  Polymer({
    is: 'misc-options',
    properties: {
      allow_reward_gifs: {
        type: Boolean,
        value: function(){
          var stored_value;
          stored_value = localStorage.getItem('allow_reward_gifs');
          if (stored_value != null) {
            return stored_value === 'true';
          }
          return true;
        }(),
        observer: 'allow_reward_gifs_changed'
      },
      allow_daily_goal_notifications: {
        type: Boolean,
        value: function(){
          var stored_value;
          stored_value = localStorage.getItem('allow_daily_goal_notifications');
          if (stored_value != null) {
            return stored_value === 'true';
          }
          return true;
        }(),
        observer: 'allow_daily_goal_notifications_changed'
      }
    },
    rerender: function(){
      this.allow_reward_gifs = function(){
        var stored_value;
        stored_value = localStorage.getItem('allow_reward_gifs');
        if (stored_value != null) {
          return stored_value === 'true';
        }
        return true;
      }();
      return this.allow_daily_goal_notifications = function(){
        var stored_value;
        stored_value = localStorage.getItem('allow_daily_goal_notifications');
        if (stored_value != null) {
          return stored_value === 'true';
        }
        return true;
      }();
    },
    allow_reward_gifs_changed: function(allow_reward_gifs, prev_value_allow_reward_gifs){
      var send_change, prev_allow_reward_gifs;
      if (prev_value_allow_reward_gifs == null) {
        return;
      }
      if (allow_reward_gifs == null) {
        return;
      }
      send_change = true;
      prev_allow_reward_gifs = localStorage.getItem('allow_reward_gifs');
      if (prev_allow_reward_gifs != null) {
        prev_allow_reward_gifs = prev_allow_reward_gifs === 'true';
        if (prev_allow_reward_gifs === allow_reward_gifs) {
          send_change = false;
        }
      }
      localStorage.setItem('allow_reward_gifs', allow_reward_gifs);
      if (allow_reward_gifs) {
        if (send_change) {
          return send_feature_enabled({
            page: 'settings',
            feature: 'allow_reward_gifs',
            manual: true
          });
        }
      } else {
        if (send_change) {
          return send_feature_disabled({
            page: 'settings',
            feature: 'allow_reward_gifs',
            manual: true
          });
        }
      }
    },
    allow_daily_goal_notifications_changed: function(allow_daily_goal_notifications, prev_value_allow_daily_goal_notifications){
      var send_change, prev_allow_daily_goal_notifications;
      if (prev_value_allow_daily_goal_notifications == null) {
        return;
      }
      if (allow_daily_goal_notifications == null) {
        return;
      }
      send_change = true;
      prev_allow_daily_goal_notifications = localStorage.getItem('allow_daily_goal_notifications');
      if (prev_allow_daily_goal_notifications != null) {
        prev_allow_daily_goal_notifications = prev_allow_daily_goal_notifications === 'true';
        if (prev_allow_daily_goal_notifications === allow_daily_goal_notifications) {
          send_change = false;
        }
      }
      localStorage.setItem('allow_daily_goal_notifications', allow_daily_goal_notifications);
      if (allow_daily_goal_notifications) {
        if (send_change) {
          return send_feature_enabled({
            page: 'settings',
            feature: 'allow_daily_goal_notifications',
            manual: true
          });
        }
      } else {
        if (send_change) {
          return send_feature_disabled({
            page: 'settings',
            feature: 'allow_daily_goal_notifications',
            manual: true
          });
        }
      }
    }
  });
}).call(this);
