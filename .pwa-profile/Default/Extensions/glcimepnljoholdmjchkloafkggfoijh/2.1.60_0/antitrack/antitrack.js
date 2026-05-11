//Includes randexp.min.js | v0.4.6 | https://github.com/fent/randexp.js

"use strict";
var AntiTrack = {
    enable_antitrack : false,
    beat_tick:0,
    settings: {

        isEnabled: function() {
            return  AntiTrack.enable_antitrack
        },
        setEenabled: function(e) {
            AntiTrack.enable_antitrack = e
         },
    },
    useragent: {
        agents: {},
        RandomAgent: function() {
            return new RandExp(/\/([a-zA-Z0-9]{8,20})/).gen()
           },
        GetAgent: function(id) {
            if(!AntiTrack.useragent.agents.hasOwnProperty(id)){
                AntiTrack.useragent.agents[id] =  AntiTrack.useragent.RandomAgent();
            }
         return AntiTrack.useragent.agents[id]
        },
        Update: function() {
            AntiTrack.beat_tick =0;
            for(let id in AntiTrack.useragent.agents){
                AntiTrack.useragent.agents[id] =  AntiTrack.useragent.RandomAgent();
            }

           },
    },
    tabstate: {
        tab: {},
        GetTabState: function(id){
            if(!this.tab.hasOwnProperty(id)){
                this.tab[id] = false;
            }
            return this.tab[id];
        },
        UpdateTabState:function(id,state){
            this.tab[id] = state;
        }
    },
    getHostname: function(url) {
        return new URL(url).hostname;
    },
   
    exclude_list: [],
    plugin_list: ["Account Helper", "Login Reminder", "Audio Clock"],
};

function AntiTrackAgentUpdate(obj) {
    if(AntiTrack.settings.isEnabled()){
        if( AntiTrack.beat_tick >=30){
            AntiTrack.useragent.Update();
        }
        AntiTrack.beat_tick++;
    }
}
function AntiTrackStateChanged(obj) {
    try
    {
        if(!obj.hasOwnProperty('enable_antitrack')) {
            return;
        }
       
        if(obj.enable_antitrack){     
          AntiTrack.useragent.Update();
          setPref(Prop.enable_antitrack, obj.enable_antitrack);
          AntiTrack.settings.setEenabled(obj.enable_antitrack);      
        }else{
          setPref(Prop.enable_antitrack,false);
          AntiTrack.settings.setEenabled(false);
        }                   
        consoleLog("AntiTrackStateChanged -> " + ",enable_antitrack:" +AntiTrack.settings.isEnabled());
        if(obj.hasOwnProperty('exclude_list')) {
        AntiTrack.exclude_list = obj.exclude_list;
        } 

    }
    catch (e) {
     consoleLog("AntiTrackStateChanged not support AntiTrack");
     }
 
}

