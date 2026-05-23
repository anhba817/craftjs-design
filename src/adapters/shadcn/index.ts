import { registerAdapter } from "../AdapterContext";
import { ShadcnBox } from "./components/Box";
import { ShadcnButton } from "./components/Button";
import { ShadcnInput } from "./components/Input";
import { ShadcnText } from "./components/Text";

registerAdapter({
  id: "shadcn",
  displayName: "shadcn",
  components: {
    box: ShadcnBox,
    text: ShadcnText,
    button: ShadcnButton,
    input: ShadcnInput,
  },
});
