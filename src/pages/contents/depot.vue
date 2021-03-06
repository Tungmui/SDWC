<template>
  <section class="wrapper">
    11
    <el-row class="head">
      <el-col class="monitor">
        <el-header class="header font-24">
          <img src="../../assets/images/airport/a_monitor.svg">
          {{ $t('depot.monitor') }}
        </el-header>
        <section class="video">
          <rt-moniter :video="node.points[0]"></rt-moniter>
        </section>
      </el-col>
      <el-col class="other">
        <section class="weather">
          <el-header class="header font-24">
            <img src="../../assets/images/airport/a_weather.svg">
            {{ $t('depot.weather') }}
          </el-header>
          <weather :weather="$store.state.weaInfo"></weather>
        </section>
        <section class="infos">
          <el-header class="header font-24">
            <img src="../../assets/images/airport/a_infos.svg">
            {{ $t('depot.depot_info') }}
          </el-header>
          <table class="info-tab">
            <tr>
              <td class="id-num">{{ $t('depot.depot_id') }}</td>
              <td>{{ node.id }}</td>
              <td>
                <el-button
                  class="font-16"
                  type="primary"
                  @click="viewOldMonitor()"
                >{{ $t('depot.view_old_monitor') }}</el-button>
              </td>
            </tr>
          </table>
        </section>
      </el-col>
    </el-row>
    <terminal :node="node"></terminal>
  </section>
</template>

<script>
import mqttClient from "../../config/mqtt";
import monitor from "../../components/rt-monitor/rt-monitor.vue";
import weather from "../../components/weather.vue";
import terminal from "../../components/depot_terminal/base.vue";

export default {
  data() {
    return {
      positionKnown: false,
      position: {
        lat: 0,
        lng: 0,
        alt: 0
      }
    };
  },
  props: {
    node: {
      type: Object,
      required: true
    }
  },
  mounted() {
    if (this.positionKnown) {
      this.getWeather();
      return;
    }
    this.getNodePosition().then(() => this.getWeather());
  },
  components: {
    "rt-moniter": monitor,
    weather: weather,
    terminal: terminal
  },
  methods: {
    getNodePosition() {
      debugger;
      return mqttClient.invoke(this.node.id, "ncp", ["status"]).then(res => {
        this.positionKnown = true;
        this.position.lat = res.lat;
        this.position.lng = res.lng;
        this.position.alt = res.alt;
      });
    },
    getWeather() {
      this.$store.dispatch("getCyWeather", this.position);
    },
    viewOldMonitor() {
      const point = this.node.points.find(
        p => p.point_type_name === "history_livestream"
      );
      if (!point) {
        this.$msgbox({
          type: "error",
          title: this.$t("common.system_tips"),
          message: this.$t("depot.no_old_monitor"),
          confirmButtonText: this.$t("common.comfirm")
        });
        return;
      }
      window.open(point.name);
    }
  }
};
</script>

<style scoped>
.head {
  width: 100%;
  height: 520px;
  border-bottom: 1px solid #e4eaef;
}
.header {
  line-height: 60px;
  padding: 0 10px;
  border-bottom: 1px solid #e4eaef;
}
.header img {
  width: 35px;
  height: 35px;
  padding-right: 10px;
}
.monitor {
  width: 640px;
  border-right: 1px solid #e4eaef;
}
.monitor .header {
  padding: 0 20px;
}
.other {
  width: calc(100% - 640px);
  height: 100%;
}
.weather {
  padding: 0 15px;
  border-bottom: 1px solid #e4eaef;
}
.infos {
  padding: 0 15px;
}
.video {
  position: relative;
  width: 100%;
  height: 460px;
  background-color: #000;
}
.video video {
  object-fit: contain;
  height: 100%;
  width: 100%;
}

.infos .info-tab {
  width: 100%;
}
.infos .info-tab td {
  white-space: nowrap;
  padding: 10px 0;
  text-align: center;
}
.infos .info-tab td.id-num {
  width: 10%;
}

.control {
  padding: 0 15px;
  border-bottom: 1px solid #e4eaef;
}
.control .battery {
  padding: 20px 0;
}
.control .infos {
  padding: 16px 0;
}
.control .control-left {
  border-right: 1px solid #e4eaef;
}
.control .battery img {
  width: 75px;
  height: 75px;
  margin-bottom: 10px;
}
.control .item-label {
  width: 80px;
}
.control .item-text {
  min-height: 30px;
}
.control .item-text span:last-child {
  padding-left: 5px;
}
.control .item-text img {
  left: 5px;
  top: 50%;
  width: 40px;
  height: 40px;
  -webkit-transform: translateY(-50%);
  -moz-transform: translateY(-50%);
  -ms-transform: translateY(-50%);
  -o-transform: translateY(-50%);
  transform: translateY(-50%);
}
.control .item-text.pos-r {
  height: 45px;
  padding-left: 64px;
}
.control .item-text.debug {
  margin-top: 20px;
}
.control .item-text.debug:before {
  content: "";
  position: absolute;
  top: -10px;
  left: 0;
  right: 0;
  height: 1px;
  background-color: #e4eaef;
}
.control .item-text.status {
  width: 290px;
  height: 20px;
}
.control.high {
  padding-bottom: 15px;
  border-bottom: 0;
}
.control.high .high-content {
  padding-top: 15px;
}
.control.high .status {
  width: 200px;
  border-right: 1px solid #e4eaef;
}
.control.high .operate tr:first-child,
.control.high .status li {
  height: 52px;
  line-height: 52px;
}
.control.high .status li button {
  width: 120px;
}
.control.high .status img {
  width: 40px;
  height: 40px;
  padding-right: 10px;
}
.control.high .operate {
  width: calc(100% - 200px);
  margin-left: 20px;
}
.control.high .status li:first-child,
.control.high .operate tr:first-child td {
  padding-bottom: 10px;
}
.control.high .operate td {
  width: calc(100% / 6);
}
.control.high .operate td img {
  width: 40px;
  height: 40px;
}
.control.high .operate .btns td button {
  width: 120px;
  height: 45px;
  padding: 0;
  margin: 0 auto;
}
.control.high .operate .btns td button:first-child {
  margin-bottom: 10px;
}
.control.high .operate .btns td:last-child button,
.control.high .operate .btns td:first-child button {
  width: 115px;
  height: 100px;
}
.control.high .operate .btns td:first-child button {
  margin: 0;
}
.control.high .operate .btns td:last-child button {
  margin: 0 auto;
}

.logs > .header {
  border-bottom: 0;
  line-height: 46px;
  padding: 0;
}
.logs-content {
  width: 100%;
  height: 300px;
  padding: 5px;
  -webkit-box-sizing: border-box;
  -moz-box-sizing: border-box;
  box-sizing: border-box;
  border: 1px solid #e4eaef;
  overflow-y: auto;
}
.logs-content li {
  line-height: 18px;
  color: #999;
}
.debug > p {
  position: relative;
  color: #999;
  margin-top: 10px;
  font-size: 14px;
  line-height: 26px;
}
.debug > p:before {
  content: "";
  position: absolute;
  top: 50%;
  right: 0;
  height: 1px;
  width: 81%;
  -webkit-transform: translateY(-50%);
  -moz-transform: translateY(-50%);
  -ms-transform: translateY(-50%);
  -o-transform: translateY(-50%);
  transform: translateY(-50%);
  background-color: #e4eaef;
}
.debug .btns > .inp {
  width: auto;
  margin-right: 10px;
}
</style>
