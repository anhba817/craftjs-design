import { registerAdapter } from "../AdapterContext";
import { ShadcnBox } from "./components/Box";

registerAdapter({
  id: "shadcn",
  displayName: "shadcn",
  components: {
    box: ShadcnBox,
  },
});
