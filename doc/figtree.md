<a name="module_figtree"></a>

## figtree

* [figtree](#module_figtree)
    * _static_
        * [.FigTree](#module_figtree.FigTree)
            * [new exports.FigTree(svg, tree, margins)](#new_module_figtree.FigTree_new)
            * _instance_
                * [.update()](#module_figtree.FigTree+update)
                * [.hilightBranches()](#module_figtree.FigTree+hilightBranches)
                * [.hilightInternalNodes()](#module_figtree.FigTree+hilightInternalNodes)
                * [.hilightExternalNodes()](#module_figtree.FigTree+hilightExternalNodes)
                * [.hilightNodes()](#module_figtree.FigTree+hilightNodes)
                * [.onClickBranch(action, selection)](#module_figtree.FigTree+onClickBranch)
                * [.onClickInternalNode(action)](#module_figtree.FigTree+onClickInternalNode)
                * [.onClickExternalNode(action)](#module_figtree.FigTree+onClickExternalNode)
                * [.onClickNode(action, selection)](#module_figtree.FigTree+onClickNode)
                * [.addLabels(selection, text)](#module_figtree.FigTree+addLabels)
            * _static_
                * [.rotate(tree, node)](#module_figtree.FigTree.rotate)
                * [.orderIncreasing(tree, node)](#module_figtree.FigTree.orderIncreasing)
                * [.orderDecreasing(tree, node)](#module_figtree.FigTree.orderDecreasing)
                * [.reroot(tree, branch, position)](#module_figtree.FigTree.reroot)
    * _inner_
        * [~addNodes()](#module_figtree..addNodes)
        * [~addBranches()](#module_figtree..addBranches)
        * [~addAxis()](#module_figtree..addAxis)

<a name="module_figtree.FigTree"></a>

### figtree.FigTree
The FigTree class

A class that takes a tree and draws it into the the given SVG root element. Has a range of methods
for adding interactivity to the tree (e.g., mouse-over labels, rotating nodes and rerooting on branches).
The tree is updated with animated transitions.

**Kind**: static class of [<code>figtree</code>](#module_figtree)  

* [.FigTree](#module_figtree.FigTree)
    * [new exports.FigTree(svg, tree, margins)](#new_module_figtree.FigTree_new)
    * _instance_
        * [.update()](#module_figtree.FigTree+update)
        * [.hilightBranches()](#module_figtree.FigTree+hilightBranches)
        * [.hilightInternalNodes()](#module_figtree.FigTree+hilightInternalNodes)
        * [.hilightExternalNodes()](#module_figtree.FigTree+hilightExternalNodes)
        * [.hilightNodes()](#module_figtree.FigTree+hilightNodes)
        * [.onClickBranch(action, selection)](#module_figtree.FigTree+onClickBranch)
        * [.onClickInternalNode(action)](#module_figtree.FigTree+onClickInternalNode)
        * [.onClickExternalNode(action)](#module_figtree.FigTree+onClickExternalNode)
        * [.onClickNode(action, selection)](#module_figtree.FigTree+onClickNode)
        * [.addLabels(selection, text)](#module_figtree.FigTree+addLabels)
    * _static_
        * [.rotate(tree, node)](#module_figtree.FigTree.rotate)
        * [.orderIncreasing(tree, node)](#module_figtree.FigTree.orderIncreasing)
        * [.orderDecreasing(tree, node)](#module_figtree.FigTree.orderDecreasing)
        * [.reroot(tree, branch, position)](#module_figtree.FigTree.reroot)

<a name="new_module_figtree.FigTree_new"></a>

#### new exports.FigTree(svg, tree, margins)
The constructor.


| Param |
| --- |
| svg | 
| tree | 
| margins | 

<a name="module_figtree.FigTree+update"></a>

#### figTree.update()
Updates the tree when it has changed

**Kind**: instance method of [<code>FigTree</code>](#module_figtree.FigTree)  
<a name="module_figtree.FigTree+hilightBranches"></a>

#### figTree.hilightBranches()
set mouseover highlighting of branches

**Kind**: instance method of [<code>FigTree</code>](#module_figtree.FigTree)  
<a name="module_figtree.FigTree+hilightInternalNodes"></a>

#### figTree.hilightInternalNodes()
Set mouseover highlighting of internal nodes

**Kind**: instance method of [<code>FigTree</code>](#module_figtree.FigTree)  
<a name="module_figtree.FigTree+hilightExternalNodes"></a>

#### figTree.hilightExternalNodes()
Set mouseover highlighting of internal nodes

**Kind**: instance method of [<code>FigTree</code>](#module_figtree.FigTree)  
<a name="module_figtree.FigTree+hilightNodes"></a>

#### figTree.hilightNodes()
Set mouseover highlighting of nodes

**Kind**: instance method of [<code>FigTree</code>](#module_figtree.FigTree)  
<a name="module_figtree.FigTree+onClickBranch"></a>

#### figTree.onClickBranch(action, selection)
Registers action function to be called when a branch is clicked on. The function should
take the tree, the node for the branch that was clicked on and the position of the click
as a proportion of the length of the branch.

Optionally a selection string can be provided - i.e., to select a particular branch by its id.

A static method - Tree.reroot() is available for rerooting the tree on the clicked branch.

**Kind**: instance method of [<code>FigTree</code>](#module_figtree.FigTree)  

| Param | Default |
| --- | --- |
| action |  | 
| selection | <code></code> | 

<a name="module_figtree.FigTree+onClickInternalNode"></a>

#### figTree.onClickInternalNode(action)
Registers action function to be called when an internal node is clicked on. The function should
take the tree and the node that was clicked on.

A static method - Tree.rotate() is available for rotating the node order at the clicked node.

**Kind**: instance method of [<code>FigTree</code>](#module_figtree.FigTree)  

| Param |
| --- |
| action | 

<a name="module_figtree.FigTree+onClickExternalNode"></a>

#### figTree.onClickExternalNode(action)
Registers action function to be called when an external node is clicked on. The function should
take the tree and the node that was clicked on.

**Kind**: instance method of [<code>FigTree</code>](#module_figtree.FigTree)  

| Param |
| --- |
| action | 

<a name="module_figtree.FigTree+onClickNode"></a>

#### figTree.onClickNode(action, selection)
Registers action function to be called when a node is clicked on. The function should
take the tree and the node that was clicked on.

Optionally a selection string can be provided - i.e., to select a particular node by its id.

**Kind**: instance method of [<code>FigTree</code>](#module_figtree.FigTree)  

| Param | Default |
| --- | --- |
| action |  | 
| selection | <code></code> | 

<a name="module_figtree.FigTree+addLabels"></a>

#### figTree.addLabels(selection, text)
Registers some text to appear in a popup box when the mouse hovers over the selection.

**Kind**: instance method of [<code>FigTree</code>](#module_figtree.FigTree)  

| Param |
| --- |
| selection | 
| text | 

<a name="module_figtree.FigTree.rotate"></a>

#### FigTree.rotate(tree, node)
A utility function for rotating a node

**Kind**: static method of [<code>FigTree</code>](#module_figtree.FigTree)  

| Param | Description |
| --- | --- |
| tree | the tree |
| node | the node |

<a name="module_figtree.FigTree.orderIncreasing"></a>

#### FigTree.orderIncreasing(tree, node)
A utility function for ordering a subtree with increasing tip density

**Kind**: static method of [<code>FigTree</code>](#module_figtree.FigTree)  

| Param | Description |
| --- | --- |
| tree | the tree |
| node | the node |

<a name="module_figtree.FigTree.orderDecreasing"></a>

#### FigTree.orderDecreasing(tree, node)
A utility function for ordering a subtree with decreasing tip density

**Kind**: static method of [<code>FigTree</code>](#module_figtree.FigTree)  

| Param | Description |
| --- | --- |
| tree | the tree |
| node | the node |

<a name="module_figtree.FigTree.reroot"></a>

#### FigTree.reroot(tree, branch, position)
A utility function for rerooting the tree

**Kind**: static method of [<code>FigTree</code>](#module_figtree.FigTree)  

| Param | Description |
| --- | --- |
| tree | the tree |
| branch | the branch |
| position | the position on the branch (0, 1) where 1 is closest to the root. |

<a name="module_figtree..addNodes"></a>

### figtree~addNodes()
Adds internal and external nodes with shapes and labels

**Kind**: inner method of [<code>figtree</code>](#module_figtree)  
<a name="module_figtree..addBranches"></a>

### figtree~addBranches()
Adds branch lines

**Kind**: inner method of [<code>figtree</code>](#module_figtree)  
<a name="module_figtree..addAxis"></a>

### figtree~addAxis()
Add axis

**Kind**: inner method of [<code>figtree</code>](#module_figtree)  
