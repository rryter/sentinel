// Import statement
import { useState, useEffect } from "react";

// Function component with JSX
function ExampleComponent({ initialCount }) {
  // State hooks
  const [count, setCount] = useState(initialCount || 0);
  const [loading, setLoading] = useState(false);

  // Effect hook
  useEffect(() => {
    document.title = `Count: ${count}`;

    // Cleanup function
    return () => {
      document.title = "React App";
    };
  }, [count]);

  // Event handler
  const handleIncrement = () => {
    setCount((prevCount) => prevCount + 1);
    setLoading(true);

    // Async operation
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  // Conditional rendering with JSX
  return (
    <div className="example-component">
      <h1>{loading ? "Loading..." : `Count: ${count}`}</h1>
      <button onClick={handleIncrement} disabled={loading}>
        Increment
      </button>
      {count > 10 && <p>You've clicked more than 10 times!</p>}
    </div>
  );
}

// Export the component
export default ExampleComponent;
