import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios';
import PaPaParse from 'papaparse'
import Config from './config.json'
import API from './API.js'
import mqttClient from './mqtt';

const handleStore = store => {
  if (localStorage.store) store.replaceState(JSON.parse(localStorage.store))  // 初始化store
  store.subscribe((mutation, state) => {
    localStorage.setItem("store", JSON.stringify(state))
  })
}

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    api: API,
    config: Config,
    token: '',
    userInfo: {},
    nodes: [],
    nodeStatus: [],
    nodeMessage: [],
    plans: [],
    links: [],
    active: '',
    initPage: 'depot',// 初始页面'plans'/'depot'/'air'
    planMap: [],
    planMapFile: { name: '', url: '' },
    planInfo: {},
    planLogs: [],
    planPage: 'view',
    weaInfo: {},
    cyForecast: false,
    cyRealtime: false,
    cyTimer: null,
    weaTimer: null
  },
  mutations: {
    config(state, arg) {
      let keys = Object.keys(state.api.local);
      state.config = arg.config;
      keys.forEach(function (key, index) {
        let server = (state.api.local[key].indexOf(arg.config.server) === -1 ? arg.config.server : '');
        state.api.local[key] = server + state.api.local[key];
        index === keys.length - 1 && arg.callback && typeof arg.callback === 'function' && arg.callback();
      });
    },
    token(state, config) {
      state.token = config.token;
      if (config.url_token != undefined) {
        state.config.suffix = state.config.suffix + config.token;
      }
    },
    userInfo(state, payload) {
      state.userInfo = payload;
    },
    itemAdd(state, arg) {
      switch (arg.type) {
        case 'nodes':
          state.nodes = arg.data;
          arg.data.forEach(node => {
            const { id } = node;
            state.nodeStatus.push({ id, status: 3 });
            state.nodeMessage.push({ id, message: [], log: [] });
          })
          break;
        case 'plans': state.plans = arg.data; break;
      }
      arg.callback && arg.callback();
    },
    nodeStatus(state, { id, status }) {
      const st = state.nodeStatus.find(s => s.id == id);
      if (!st) return;
      st.status = status;
    },
    nodeMessage(state, { id, message }) {
      let st = state.nodeMessage.find(s => s.id == id);
      if (!st) return;
      try {
        st.message.push(JSON.parse(message))
      } catch (e) {
        st.log.push(message);
      }
    },
    linkAdd(state, arg) {
      if (state.links.length === 0) {
        state.links.push(arg);
      } else {
        // 先判断类型，若不存在对应类型则直接添加，若存在则继续判断是否有相同id存在，不存在则添加
        state.links.findIndex(val => val.type === arg.type) === -1 ?
          state.links.push(arg) :
          (state.links.findIndex(val => {
            return val.type === arg.type && (+val.item.id) === (+arg.item.id);
          }) === -1 && state.links.push(arg));
      }
      // 激活对应Tab
      state.active = arg.type + arg.item.id;
    },
    tabChange(state, item) {
      state.active = item;
    },
    linkDel(state, arg) {
      state.links.splice(state.links.findIndex(val => {
        return val.type === arg.type && val.item.id === (+arg.id)
      }), 1);
    },
    planLink(state, name) {
      state.planPage = name;
    },
    planAdd(state, data) {
      state.plans.push(data);
      state.planPage = 'view';
    },
    planSave(state, arg) {
      arg._this.$set(state.plans, state.plans.findIndex(val => val.id === (+arg.data.id)), arg.data);
      arg._this.$set(state.links, state.links.findIndex(val => {
        return val.type === 'plans' && val.item.id === (+arg.data.id);
      }), { type: 'plans', item: arg.data });
    },
    planDel(state, id) {
      state.plans.splice(state.plans.findIndex(val => val.id === (+id)), 1);
    },
    planInfo(state, info) {
      state.planInfo = info;
    },
    planLogs(state, logs) {
      state.planLogs = logs;
    },
    planMap(state, maps) {
      state.planMap = maps;
    },
    planMapFile(state, { name, url }) {
      state.planMapFile.name = name;
      state.planMapFile.url = url;
    },
    weatherInfo(state, info) {
      state.weaInfo = info;
    },
    cyForecast(state, data) {
      state.cyForecast = data;
    },
    cyRealtime(state, data) {
      state.cyRealtime = data;
    },
    cyTimer(state, timer) {
      state.cyTimer = timer;
    },
    weatherTimer(state, timer) {
      state.weaTimer = timer;
    }
  },
  actions: {
    // 项目全局初始化
    appInit(context, _this) {
      return _this.$http.get(`${location.protocol}//${location.host}/config.json`)
        .then(res => {
          _this.$i18n.locale = res.data.lang ? res.data.lang : context.state.config.lang;
          context.commit('config', {
            config: res.data,
          });
        })
        .catch(() => {
          context.commit('config', {
            config: context.state.config,
          });
        });
    },
    // 获取
    getSideMenu(context, arg) {
      let url = context.state.config.suffix !== '' ? context.state.api.local[arg.type] + context.state.config.suffix : context.state.api.local[arg.type];
      // 获取plans/nodes
      return arg._this.$http.get(url)
        .then(res => {
          if (res.status === 200) {
            context.commit('itemAdd', {
              type: arg.type,
              data: res.data,
              callback: () => {
                context.dispatch('initShow', arg._this);
              }
            });
          }
        })
        .catch(err => {
          console.log(err);
        });
    },
    // 刷新之后默认显示页面处理
    initShow(context, _this) {
      let init = context.state.initPage,
        nodeList = context.state.nodes,
        planList = context.state.plans;
      for (let item of (init !== 'plans' ? nodeList : planList)) {
        if (init === item.type_name) {
          context.dispatch('tabsAdd', { key: init, item });
          if (init === 'air') {
            context.state.weaTimer && clearInterval(context.state.weaTimer);
          } else if (init === 'depot') {
            context.dispatch('getWeather', _this);
          }
          return true;
        } else if (!item.type_name) {
          context.dispatch('tabsAdd', { key: init, item });
          return true;
        }
      }
    },
    // 添加并激活对应Tabs
    tabsAdd(context, arg) {
      // 先判断类型，若不存在对应类型则直接添加，若存在则继续判断是否有相同id存在，不存在则添加
      context.state.links.findIndex(val => val.type === arg.key) === -1 ?
        context.commit('linkAdd', { item: arg.item, type: arg.key }) :
        (context.state.links.findIndex(val => {
          return val.type === arg.key && (+val.item.id) === (+arg.item.id);
        }) === -1 && context.commit('linkAdd', { item: arg.item, type: arg.key }));
    },
    // 获取任务信息
    getPlanInfo(context, arg) {
      context.commit('planMap', []);
      context.commit('planLink', 'view');// 先将任务界面切回'查看任务'
      let url = context.state.config.suffix !== '' ? `${context.state.api.local.plans}/${arg.id}` + context.state.config.suffix : `${context.state.api.local.plans}/${arg.id}`;
      const headers = { authorization: context.state.token };
      arg._this.$http.get(url, { headers })
        .then(res => {
          if (res.status === 200) {
            context.commit('planInfo', res.data);
            context.dispatch('getPlanLogs', { _this: arg._this, id: res.data.id });
            context.dispatch('getWayPoints', { _this: arg._this, path: res.data['map_path'] });
          }
        })
        .catch(err => {
          console.log(err);
        });
    },
    // 获取任务历史日志
    getPlanLogs(context, arg) {
      let url = context.state.config.suffix !== '' ? `${context.state.api.local.plans}/${arg.id}/plan_logs` + context.state.config.suffix : `${context.state.api.local.plans}/${arg.id}/plan_logs`;
      const headers = { authorization: context.state.token };
      arg._this.$http.get(url, { headers })
        .then(res => {
          if (res.status === 200) {
            for (let val of res.data) {
              val.created_at = val.created_at ? arg._this.$utils.timeFomart('YYYY/MM/DD hh:mm:ss', Date.parse(val.created_at)) : '';
              val.updated_at = val.updated_at ? arg._this.$utils.timeFomart('YYYY/MM/DD hh:mm:ss', Date.parse(val.updated_at)) : '';
            }
            context.commit('planLogs', res.data);
          }
        })
        .catch(err => {
          console.log(err);
        });
    },
    // 解析(任务)地图位点
    getWayPoints(context, arg) {
      if (this.state.planMapFile.url) {
        URL.revokeObjectURL(this.state.planMapFile.url);
        context.commit('planMapFile', { url: null, name: null });
      }
      const headers = { authorization: context.state.token };
      arg._this.$http.get(context.state.config.server + arg.path, { headers, responseType: 'blob' })
        .then(res => {
          if (res.status === 200) {
            const reader = new FileReader();
            reader.addEventListener('loadend', () => {
              let result = [],
                parseData = PaPaParse.parse(reader.result)['data'];
              parseData.forEach((val, index) => {
                val[3] === '16' && result.push({ lat: (+val[8]), lng: (+val[9]) });
                parseData.length - 1 === index && context.commit('planMap', result);
              });
            });
            reader.readAsText(res.data);
            const url = URL.createObjectURL(res.data);
            let name = `plan_${context.state.planInfo.id}.waypoints`;
            try {
              name = contentDisposition.parse(res.headers['Content-Disposition']).parameters.filename;
            } catch (e) { /* ignore */ }
            context.commit('planMapFile', { url, name });
          }
        })
        .catch(err => {
          console.log(err);
          context.commit('planMap', []);
        });
    },
    downloadPlanFile({ state }) {
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = state.planMapFile.url;
      a.download = state.planMapFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    // 获取节点状态
    subscribeNodeStatus({ commit }) {
      mqttClient.on('status', status => {
        commit('nodeStatus', status);
      });
      mqttClient.on('message', message => {
        commit('nodeMessage', message);
      });
    },
    // 获取彩云APP天气信息
    getCyWeather(context, arg) {
      let forecast = `${context.state.api.remote.cyApi}/${context.state.config.CY_API_TOKEN}/${arg.lng},${arg.lat}/forecast`,
        realtime = `${context.state.api.remote.cyApi}/${context.state.config.CY_API_TOKEN}/${arg.lng},${arg.lat}/realtime`;
      Vue.prototype.$jsonp(forecast)
        .then(res => {
          res.status === 'ok' && context.commit('cyForecast', res.result);
        })
        .catch(err => { console.log(err); });
      Vue.prototype.$jsonp(realtime)
        .then(res => {
          res.status === 'ok' && context.commit('cyRealtime', res.result);
        })
        .catch(err => { console.log(err); });
    },
    // 获取天气信息
    getWeather(context) {
      context.state.weaTimer && clearInterval(context.state.weaTimer);
      context.dispatch('getWeaInfo');
      context.commit('weatherTimer',
        setInterval(() => {
          context.dispatch('getWeaInfo');
        }, 1000 * 60));
    },
    getWeaInfo(context) {
      axios.get(context.state.api.remote.weather)
        .then(res => {
          res.status === 200 && context.commit('weatherInfo', res.data[0]);
        }).catch(err => {
          console.log(err);
        });
    }
  },
  getters: {
    depotNodes(state) {
      return state.nodes.filter(node => node.type_name === 'depot');
    },
    airNodes(state) {
      return state.nodes.filter(node => node.type_name === 'air');
    },
    authHeader(state) {
      return { Authorization: state.token };
    }
  },
  plugins: [handleStore]
});
