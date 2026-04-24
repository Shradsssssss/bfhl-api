const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 3000;

// -------- VALIDATION --------
const isValid = (edge) => {
  if (!edge || typeof edge !== "string") return false;

  edge = edge.trim();
  const parts = edge.split("->");

  if (parts.length !== 2) return false;

  const [parent, child] = parts;

  if (parent.length !== 1 || child.length !== 1) return false;
  if (!/[A-Z]/.test(parent) || !/[A-Z]/.test(child)) return false;
  if (parent === child) return false;

  return true;
};

// -------- GRAPH BUILD --------
const buildGraph = (edges) => {
  const graph = {};
  const children = new Set();

  edges.forEach(([p, c]) => {
    if (!graph[p]) graph[p] = [];
    graph[p].push(c);
    children.add(c);
  });

  return { graph, children };
};

// -------- CYCLE CHECK --------
const hasCycle = (node, graph, visited, stack) => {
  if (stack.has(node)) return true;
  if (visited.has(node)) return false;

  visited.add(node);
  stack.add(node);

  for (let n of graph[node] || []) {
    if (hasCycle(n, graph, visited, stack)) return true;
  }

  stack.delete(node);
  return false;
};

// -------- BUILD TREE --------
const buildTree = (node, graph) => {
  let obj = {};
  (graph[node] || []).forEach(child => {
    obj[child] = buildTree(child, graph);
  });
  return obj;
};

// -------- DEPTH --------
const findDepth = (node, graph) => {
  const children = graph[node] || [];
  if (children.length === 0) return 1;

  return 1 + Math.max(...children.map(c => findDepth(c, graph)));
};

// -------- MAIN API --------
app.post("/bfhl", (req, res) => {
  const data = req.body.data || [];

  const validEdges = [];
  const invalidEntries = [];
  const duplicates = new Set();
  const seen = new Set();

  data.forEach(item => {
    if (!isValid(item)) {
      invalidEntries.push(item);
    } else {
      if (seen.has(item)) {
        duplicates.add(item);
      } else {
        seen.add(item);
        const [p, c] = item.split("->");
        validEdges.push([p, c]);
      }
    }
  });

  const { graph, children } = buildGraph(validEdges);

  const nodes = new Set([
    ...validEdges.map(e => e[0]),
    ...validEdges.map(e => e[1])
  ]);

  let roots = [...nodes].filter(n => !children.has(n));

  // handle cycle-only case
  if (roots.length === 0 && nodes.size > 0) {
    roots = [[...nodes].sort()[0]];
  }

  let hierarchies = [];
  let totalTrees = 0;
  let totalCycles = 0;
  let maxDepth = 0;
  let bestRoot = "";

  roots.forEach(root => {
    const cycle = hasCycle(root, graph, new Set(), new Set());

    if (cycle) {
      totalCycles++;
      hierarchies.push({
        root,
        tree: {},
        has_cycle: true
      });
    } else {
      const treeObj = {};
      treeObj[root] = buildTree(root, graph);

      const depth = findDepth(root, graph);
      totalTrees++;

      if (depth > maxDepth || (depth === maxDepth && root < bestRoot)) {
        maxDepth = depth;
        bestRoot = root;
      }

      hierarchies.push({
        root,
        tree: treeObj,
        depth
      });
    }
  });

  res.json({
    user_id: "shraddhapanjwani_10112004",
    email_id: "sp6367@srmist.edu.in",
    college_roll_number: "RA2311003012177",
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: [...duplicates],
    summary: {
      total_trees: totalTrees,
      total_cycles: totalCycles,
      largest_tree_root: bestRoot
    }
  });
});

// -------- START SERVER --------
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});