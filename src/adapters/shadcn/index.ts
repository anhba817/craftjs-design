import { registerAdapter } from "../AdapterContext";
import { ShadcnBox } from "./components/Box";
import { ShadcnText } from "./components/Text";

registerAdapter({
  id: "shadcn",
  displayName: "shadcn",
  components: {
    box: ShadcnBox,
    text: ShadcnText,
  },
});
