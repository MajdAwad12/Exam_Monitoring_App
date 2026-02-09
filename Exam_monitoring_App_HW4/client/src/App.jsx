//client/src/App.jsx 
import { RouterProvider } from "react-router-dom";
import { WebSocketProvider } from "./websocket/WebSocketProvider.jsx";
import router from "./routes/router.jsx";

/**
 * Root component of the app.
 * Keeps main.jsx focused on mounting React to the DOM.
 */
export default function App() {
  return (
    <WebSocketProvider>
      <RouterProvider router={router} />
    </WebSocketProvider>
  );
}
