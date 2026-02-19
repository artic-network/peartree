<a name="module_tree"></a>

## tree

* [tree](#module_tree)
    * _static_
        * [.Tree](#module_tree.Tree)
            * [new exports.Tree(rootNode)](#new_module_tree.Tree_new)
            * _instance_
                * [.rootNode](#module_tree.Tree+rootNode) ⇒ <code>Object</code> \| <code>\*</code>
                * [.nodes](#module_tree.Tree+nodes) ⇒ <code>\*</code>
                * [.externalNodes](#module_tree.Tree+externalNodes) ⇒ <code>\*</code>
                * [.internalNodes](#module_tree.Tree+internalNodes) ⇒ <code>\*</code>
                * [.getSibling(node)](#module_tree.Tree+getSibling) ⇒ <code>\*</code>
                * [.getNode(key)](#module_tree.Tree+getNode) ⇒ <code>\*</code>
                * [.preorder()](#module_tree.Tree+preorder) ⇒ <code>IterableIterator.&lt;IterableIterator.&lt;(\*\|\*)&gt;&gt;</code>
                * [.postorder()](#module_tree.Tree+postorder) ⇒ <code>IterableIterator.&lt;IterableIterator.&lt;(\*\|\*)&gt;&gt;</code>
                * [.toNewick(node)](#module_tree.Tree+toNewick) ⇒ <code>string</code>
                * [.reroot(node, proportion)](#module_tree.Tree+reroot)
                * [.rotate(node, recursive)](#module_tree.Tree+rotate)
                * [.order(node, increasing)](#module_tree.Tree+order) ⇒ <code>number</code>
                * [.rootToTipLength(tip)](#module_tree.Tree+rootToTipLength) ⇒ <code>number</code>
                * [.rootToTipLengths()](#module_tree.Tree+rootToTipLengths) ⇒ <code>\*</code>
            * _static_
                * [.pathToRoot()](#module_tree.Tree.pathToRoot) ⇒ <code>IterableIterator.&lt;IterableIterator.&lt;(\*\|\*)&gt;&gt;</code>
                * [.parseNewick(newickString, datePrefix)](#module_tree.Tree.parseNewick) ⇒ <code>Tree</code>
    * _inner_
        * [~orderNodes(node, increasing, callback)](#module_tree..orderNodes) ⇒ <code>number</code>

<a name="module_tree.Tree"></a>

### tree.Tree
The Tree class

**Kind**: static class of [<code>tree</code>](#module_tree)  

* [.Tree](#module_tree.Tree)
    * [new exports.Tree(rootNode)](#new_module_tree.Tree_new)
    * _instance_
        * [.rootNode](#module_tree.Tree+rootNode) ⇒ <code>Object</code> \| <code>\*</code>
        * [.nodes](#module_tree.Tree+nodes) ⇒ <code>\*</code>
        * [.externalNodes](#module_tree.Tree+externalNodes) ⇒ <code>\*</code>
        * [.internalNodes](#module_tree.Tree+internalNodes) ⇒ <code>\*</code>
        * [.getSibling(node)](#module_tree.Tree+getSibling) ⇒ <code>\*</code>
        * [.getNode(key)](#module_tree.Tree+getNode) ⇒ <code>\*</code>
        * [.preorder()](#module_tree.Tree+preorder) ⇒ <code>IterableIterator.&lt;IterableIterator.&lt;(\*\|\*)&gt;&gt;</code>
        * [.postorder()](#module_tree.Tree+postorder) ⇒ <code>IterableIterator.&lt;IterableIterator.&lt;(\*\|\*)&gt;&gt;</code>
        * [.toNewick(node)](#module_tree.Tree+toNewick) ⇒ <code>string</code>
        * [.reroot(node, proportion)](#module_tree.Tree+reroot)
        * [.rotate(node, recursive)](#module_tree.Tree+rotate)
        * [.order(node, increasing)](#module_tree.Tree+order) ⇒ <code>number</code>
        * [.rootToTipLength(tip)](#module_tree.Tree+rootToTipLength) ⇒ <code>number</code>
        * [.rootToTipLengths()](#module_tree.Tree+rootToTipLengths) ⇒ <code>\*</code>
    * _static_
        * [.pathToRoot()](#module_tree.Tree.pathToRoot) ⇒ <code>IterableIterator.&lt;IterableIterator.&lt;(\*\|\*)&gt;&gt;</code>
        * [.parseNewick(newickString, datePrefix)](#module_tree.Tree.parseNewick) ⇒ <code>Tree</code>

<a name="new_module_tree.Tree_new"></a>

#### new exports.Tree(rootNode)
The constructor takes an object for the root node. The tree structure is
defined as nested node objects.


| Param | Type | Description |
| --- | --- | --- |
| rootNode | <code>object</code> | The root node of the tree as an object. |

<a name="module_tree.Tree+rootNode"></a>

#### tree.rootNode ⇒ <code>Object</code> \| <code>\*</code>
Gets the root node of the Tree

**Kind**: instance property of [<code>Tree</code>](#module_tree.Tree)  
<a name="module_tree.Tree+nodes"></a>

#### tree.nodes ⇒ <code>\*</code>
Gets an array containing all the node objects

**Kind**: instance property of [<code>Tree</code>](#module_tree.Tree)  
<a name="module_tree.Tree+externalNodes"></a>

#### tree.externalNodes ⇒ <code>\*</code>
Gets an array containing all the external node objects

**Kind**: instance property of [<code>Tree</code>](#module_tree.Tree)  
<a name="module_tree.Tree+internalNodes"></a>

#### tree.internalNodes ⇒ <code>\*</code>
Gets an array containing all the internal node objects

**Kind**: instance property of [<code>Tree</code>](#module_tree.Tree)  
<a name="module_tree.Tree+getSibling"></a>

#### tree.getSibling(node) ⇒ <code>\*</code>
Returns the sibling of a node (i.e., the first other child of the parent)

**Kind**: instance method of [<code>Tree</code>](#module_tree.Tree)  

| Param |
| --- |
| node | 

<a name="module_tree.Tree+getNode"></a>

#### tree.getNode(key) ⇒ <code>\*</code>
Returns a node from its key (a unique Symbol) stored in
the node as poperty 'key'.

**Kind**: instance method of [<code>Tree</code>](#module_tree.Tree)  

| Param |
| --- |
| key | 

<a name="module_tree.Tree+preorder"></a>

#### tree.preorder() ⇒ <code>IterableIterator.&lt;IterableIterator.&lt;(\*\|\*)&gt;&gt;</code>
A generator function that returns the nodes in a pre-order traversal.

**Kind**: instance method of [<code>Tree</code>](#module_tree.Tree)  
<a name="module_tree.Tree+postorder"></a>

#### tree.postorder() ⇒ <code>IterableIterator.&lt;IterableIterator.&lt;(\*\|\*)&gt;&gt;</code>
A generator function that returns the nodes in a post-order traversal

**Kind**: instance method of [<code>Tree</code>](#module_tree.Tree)  
<a name="module_tree.Tree+toNewick"></a>

#### tree.toNewick(node) ⇒ <code>string</code>
An instance method to return a Newick format string for the Tree. Can be called without a parameter to
start at the root node. Providing another node will generate a subtree. Labels and branch lengths are
included if available.

**Kind**: instance method of [<code>Tree</code>](#module_tree.Tree)  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>object</code> | The node of the tree to be written (defaults as the rootNode). |

<a name="module_tree.Tree+reroot"></a>

#### tree.reroot(node, proportion)
Re-roots the tree at the midway point on the branch above the given node.

**Kind**: instance method of [<code>Tree</code>](#module_tree.Tree)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| node | <code>object</code> |  | The node to be rooted on. |
| proportion |  | <code>0.5</code> | proportion along the branch to place the root (default 0.5) |

<a name="module_tree.Tree+rotate"></a>

#### tree.rotate(node, recursive)
Reverses the order of the children of the given node. If 'recursive=true' then it will
descend down the subtree reversing all the sub nodes.

**Kind**: instance method of [<code>Tree</code>](#module_tree.Tree)  

| Param | Default |
| --- | --- |
| node |  | 
| recursive | <code>false</code> | 

<a name="module_tree.Tree+order"></a>

#### tree.order(node, increasing) ⇒ <code>number</code>
Sorts the child branches of each node in order of increasing or decreasing number
of tips. This operates recursively from the node given.

**Kind**: instance method of [<code>Tree</code>](#module_tree.Tree)  
**Returns**: <code>number</code> - - the number of tips below this node  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| node |  |  | the node to start sorting from |
| increasing | <code>boolean</code> | <code>true</code> | sorting in increasing node order or decreasing? |

<a name="module_tree.Tree+rootToTipLength"></a>

#### tree.rootToTipLength(tip) ⇒ <code>number</code>
Gives the distance from the root to a given tip (external node).

**Kind**: instance method of [<code>Tree</code>](#module_tree.Tree)  

| Param | Description |
| --- | --- |
| tip | the external node |

<a name="module_tree.Tree+rootToTipLengths"></a>

#### tree.rootToTipLengths() ⇒ <code>\*</code>
Returns an array of root-to-tip distances for each tip in the tree.

**Kind**: instance method of [<code>Tree</code>](#module_tree.Tree)  
<a name="module_tree.Tree.pathToRoot"></a>

#### Tree.pathToRoot() ⇒ <code>IterableIterator.&lt;IterableIterator.&lt;(\*\|\*)&gt;&gt;</code>
A generator function that returns the nodes in a path to the root

**Kind**: static method of [<code>Tree</code>](#module_tree.Tree)  
<a name="module_tree.Tree.parseNewick"></a>

#### Tree.parseNewick(newickString, datePrefix) ⇒ <code>Tree</code>
A class method to create a Tree instance from a Newick format string (potentially with node
labels and branch lengths). Taxon labels should be quoted (either " or ') if they contain whitespace
or any of the tree definitition characters '(),:;' - the quotes (and any whitespace immediately within)
will be removed.

**Kind**: static method of [<code>Tree</code>](#module_tree.Tree)  
**Returns**: <code>Tree</code> - - an instance of the Tree class  

| Param | Description |
| --- | --- |
| newickString | the Newick format tree as a string |
| datePrefix |  |

<a name="module_tree..orderNodes"></a>

### tree~orderNodes(node, increasing, callback) ⇒ <code>number</code>
A private recursive function that rotates nodes to give an ordering.

**Kind**: inner method of [<code>tree</code>](#module_tree)  

| Param | Default | Description |
| --- | --- | --- |
| node |  |  |
| increasing |  |  |
| callback | <code></code> | an optional callback that is called each rotate |

