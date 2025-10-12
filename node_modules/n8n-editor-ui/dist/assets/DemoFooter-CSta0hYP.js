import LogsPanel from "./LogsPanel-Bx9fyPSK.js";
import { d as defineComponent, a2 as useWorkflowsStore, x as computed, e as createBlock, f as createCommentVNode, g as openBlock } from "./index-lIYGhjbM.js";
import "./AnimatedSpinner-Za8kTCo8.js";
import "./ConsumedTokensDetails.vue_vue_type_script_setup_true_lang-D5tiO03r.js";
import "./core-CIbj9qJ7.js";
import "./canvas-BK8zbKSC.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "DemoFooter",
  setup(__props) {
    const workflowsStore = useWorkflowsStore();
    const hasExecutionData = computed(() => workflowsStore.workflowExecutionData);
    return (_ctx, _cache) => {
      return hasExecutionData.value ? (openBlock(), createBlock(LogsPanel, {
        key: 0,
        "is-read-only": true
      })) : createCommentVNode("", true);
    };
  }
});
export {
  _sfc_main as default
};
