import Vue from 'vue';
import Vuex, { Commit } from 'vuex';
import axios from 'axios';
import { ScaleContinuousNumeric, scaleLinear, scaleLog } from 'd3-scale';
import constants from './config';
import exampleData from './example-data';
import { PaperKey, Paper, Node, Link, YearData } from '@/typings';

Vue.use(Vuex);

function updateReferences(addedPapers: Paper[], commit: Commit) {
  const keys = addedPapers.map(p => p.key);
  axios.get('/references', { params: { papers: keys } })
    .then((response) => {
      const graphPapers = response.data.papers;
      commit('SET_GRAPH_PAPERS', graphPapers);
    })
    .catch((error) => {
      console.log(error);
    })
    .then(() => {
      commit('SET_WAITING_FOR_GRAPH', false);
    });
}

interface StoreData {
  graphPapers: YearData[]
  addedPapers: Paper[]
  isDrawerOpen: boolean
  isAboutVisible: boolean
  isWaitingForGraph: boolean
  nodesData: Node[]
  linksData: Link[]
  hoveredPapers: PaperKey[]
  minimumReferencedGlobal: number
  maximumReferencedGlobal: number
  minimumReferencedLocal: number
  maximumReferencedLocal: number
  radiusScale?: ScaleContinuousNumeric<number, number>
  colorScale?: ScaleContinuousNumeric<string, string>
  shadowColorScale?: ScaleContinuousNumeric<string, string>
}

/* eslint no-param-reassign: [2, { "props": false }] */
export default new Vuex.Store<StoreData>({
  state: {
    graphPapers: [],
    addedPapers: [],
    isDrawerOpen: true,
    isAboutVisible: false,
    isWaitingForGraph: false,
    nodesData: [],
    linksData: [],
    hoveredPapers: [],
    minimumReferencedGlobal: -1,
    maximumReferencedGlobal: -1,
    minimumReferencedLocal: -1,
    maximumReferencedLocal: -1,
    radiusScale: undefined,
    colorScale: undefined,
    shadowColorScale: undefined,
  },
  mutations: {
    ADD_PAPER(state, paper) {
      state.addedPapers.push(paper);
    },
    REMOVE_PAPER(state, index) {
      state.addedPapers.splice(index, 1);
    },
    REMOVE_ALL_PAPERS(state) {
      state.addedPapers = [];
    },
    SET_ADDED_PAPERS(state, addedPapers) {
      state.addedPapers = addedPapers;
    },
    SET_GRAPH_PAPERS(state, graphPapers: YearData[]) {
      state.graphPapers = graphPapers;
      state.nodesData = exampleData.nodesData;
      state.linksData = exampleData.linksData;

      const globalNumbers = state.nodesData.map(p => p.referencedNTimesGlobal);
      const localNumbers = state.nodesData.map(p => p.referencedNTimesLocal);
      state.minimumReferencedGlobal = Math.min(...globalNumbers);
      state.maximumReferencedGlobal = Math.min(...globalNumbers);
      state.minimumReferencedLocal = Math.min(...localNumbers);
      state.maximumReferencedLocal = Math.min(...localNumbers);

      // must not be zero => + 1
      state.radiusScale = scaleLog()
        .domain([state.minimumReferencedGlobal + 1, state.maximumReferencedGlobal + 1])
        .range([constants.minimumRadius, constants.maximumRadius]);
      state.colorScale = scaleLinear<string>()
        .domain([state.minimumReferencedLocal, state.maximumReferencedLocal])
        .range([constants.colorMin, constants.colorMax]);
      state.shadowColorScale = scaleLinear<string>()
        .domain([state.minimumReferencedLocal, state.maximumReferencedLocal])
        .range([constants.colorShadowMin, constants.colorMax]);
    },
    SET_DRAWER_STATUS(state, value) {
      state.isDrawerOpen = value;
    },
    SET_ABOUT_STATUS(state, value) {
      state.isAboutVisible = value;
    },
    SET_WAITING_FOR_GRAPH(state, value) {
      state.isWaitingForGraph = value;
    },
    SET_HOVER(state, key: string) {
      if (!state.hoveredPapers.includes(key)) {
        state.hoveredPapers.push(key);
      }
    },
    REMOVE_HOVER(state, key) {
      for (let index = 0; index < state.hoveredPapers.length; index += 1) {
        if (state.hoveredPapers[index] === key) {
          state.hoveredPapers.splice(index, 1);
        }
      }
    },
  },
  actions: {
    addPaper({ commit, state }, paper) {
      commit('ADD_PAPER', paper);
      commit('SET_WAITING_FOR_GRAPH', true);
      updateReferences(state.addedPapers, commit);
    },
    removePaper({ commit, state }, index) {
      commit('REMOVE_PAPER', index);
      if (state.addedPapers.length === 0) {
        commit('SET_GRAPH_PAPERS', []);
      } else {
        commit('SET_WAITING_FOR_GRAPH', true);
        updateReferences(state.addedPapers, commit);
      }
    },
    removeAllPapers({ commit }) {
      commit('REMOVE_ALL_PAPERS');
      commit('SET_GRAPH_PAPERS', []);
    },
    setDrawerStatus({ commit }, value) {
      commit('SET_DRAWER_STATUS', value);
    },
    toggleDrawerStatus({ commit, state }) {
      const oldValue = state.isDrawerOpen;
      const newValue = !oldValue;
      commit('SET_DRAWER_STATUS', newValue);
    },
    setAboutStatus({ commit }, value) {
      commit('SET_ABOUT_STATUS', value);
    },
    openAbout({ commit }) {
      commit('SET_ABOUT_STATUS', true);
    },
    loadExample({ commit }) {
      commit('SET_ADDED_PAPERS', exampleData.addedPapersExample);
      commit('SET_GRAPH_PAPERS', exampleData.graphPapersExample);
    },
    setHover({ commit }, key) {
      commit('SET_HOVER', key);
    },
    removeHover({ commit }, key) {
      // receive the key as well in case the next hover is triggered before remove is called
      commit('REMOVE_HOVER', key);
    },
  },
});