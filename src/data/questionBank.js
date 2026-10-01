// Well-known interview questions widely reported from FAANG / big-tech interviews.
// Problem statements are paraphrased. `points` = what a strong answer covers (used for offline scoring).

const c = (title, difficulty, companies, prompt, points) => ({ title, difficulty, companies, prompt, points });

export const CODING_QUESTIONS = [
  // ---------- easy ----------
  c('Two Sum', 'easy', ['Google', 'Amazon', 'Meta', 'Apple'],
    'Given an integer array nums and an integer target, return the indices of the two numbers that add up to target. Exactly one solution exists and you cannot use the same element twice.\nExample: nums = [2, 7, 11, 15], target = 9  ->  [0, 1]',
    ['Use a hash map from value to index', 'Look up the complement (target minus current value)', 'Single pass, O(n) time', 'O(n) extra space', 'Mention brute force O(n^2) as a baseline']),
  c('Valid Parentheses', 'easy', ['Amazon', 'Meta', 'Google'],
    'Given a string containing only ( ) [ ] { }, decide whether it is valid: every opening bracket is closed by the same type, in the correct order.\nExample: "()[]{}" -> true, "(]" -> false, "([)]" -> false',
    ['Use a stack', 'Push opening brackets, pop on closing brackets', 'Check that bracket types match', 'Stack must be empty at the end', 'O(n) time']),
  c('Merge Two Sorted Lists', 'easy', ['Amazon', 'Microsoft', 'Apple'],
    'Merge two sorted singly linked lists into one sorted list and return its head.\nExample: 1->2->4 and 1->3->4  ->  1->1->2->3->4->4',
    ['Dummy head node', 'Two pointers comparing values', 'Attach the remaining list at the end', 'O(n + m) time, O(1) extra space']),
  c('Best Time to Buy and Sell Stock', 'easy', ['Amazon', 'Meta', 'Microsoft'],
    'Given daily stock prices, return the maximum profit from one buy followed by one later sell (0 if no profit is possible).\nExample: [7, 1, 5, 3, 6, 4] -> 5',
    ['Track the minimum price seen so far', 'Compute profit at each day', 'Single pass O(n) time', 'O(1) space']),
  c('Valid Anagram', 'easy', ['Amazon', 'Meta', 'Bloomberg'],
    'Given two strings s and t, return true if t is an anagram of s.\nExample: s = "anagram", t = "nagaram" -> true',
    ['Count characters with a hash map or 26-size array', 'Compare the counts', 'Lengths must match', 'O(n) time', 'Sorting alternative is O(n log n)']),
  c('Reverse Linked List', 'easy', ['Amazon', 'Microsoft', 'Apple'],
    'Reverse a singly linked list and return the new head.\nExample: 1->2->3->4->5  ->  5->4->3->2->1',
    ['Iterative with prev, current and next pointers', 'Recursive alternative', 'O(n) time, O(1) space iteratively']),
  c('Maximum Depth of Binary Tree', 'easy', ['Amazon', 'LinkedIn', 'Google'],
    'Return the maximum depth (number of nodes on the longest root-to-leaf path) of a binary tree.',
    ['Recursion: depth = 1 + max(left, right)', 'Base case: null node returns 0', 'BFS level counting alternative', 'O(n) time']),
  c('Contains Duplicate', 'easy', ['Amazon', 'Apple', 'Adobe'],
    'Return true if any value appears at least twice in the array.\nExample: [1, 2, 3, 1] -> true',
    ['Hash set to track seen values', 'Return early on a repeat', 'O(n) time, O(n) space', 'Sorting alternative O(n log n)']),
  c('Binary Search', 'easy', ['Microsoft', 'Google'],
    'Given a sorted array and a target, return the index of the target or -1, in O(log n) time.',
    ['Low and high pointers', 'mid = low + (high - low) / 2 to avoid overflow', 'Move the correct bound each step', 'O(log n) time']),
  c('Climbing Stairs', 'easy', ['Amazon', 'Google', 'Adobe'],
    'You can climb 1 or 2 steps at a time. In how many distinct ways can you reach step n?\nExample: n = 3 -> 3',
    ['Dynamic programming', 'ways(n) = ways(n-1) + ways(n-2)', 'Fibonacci pattern', 'O(n) time, O(1) space with two variables']),
  c('Linked List Cycle', 'easy', ['Amazon', 'Microsoft'],
    'Determine whether a singly linked list contains a cycle.',
    ['Floyd slow and fast pointers', 'Pointers meet if there is a cycle', 'O(1) extra space', 'Hash set alternative']),
  c('Invert Binary Tree', 'easy', ['Google', 'Amazon'],
    'Mirror a binary tree (swap every node\'s left and right children) and return the root.',
    ['Swap left and right children', 'Recursive DFS or iterative BFS', 'O(n) time']),
  c('Missing Number', 'easy', ['Amazon', 'Microsoft'],
    'An array contains n distinct numbers from the range 0..n. Return the one number missing.\nExample: [3, 0, 1] -> 2',
    ['Sum formula n(n+1)/2 minus the array sum', 'XOR alternative', 'O(n) time, O(1) space']),
  c('Majority Element', 'easy', ['Amazon', 'Google'],
    'Return the element that appears more than n/2 times in the array.',
    ['Boyer-Moore voting algorithm', 'Keep a candidate and a count', 'Hash map counting alternative', 'O(n) time, O(1) space']),
  c('Move Zeroes', 'easy', ['Meta', 'Amazon'],
    'Move all zeros to the end of the array in place while keeping the order of non-zero elements.\nExample: [0, 1, 0, 3, 12] -> [1, 3, 12, 0, 0]',
    ['Two pointers', 'Write index for non-zero elements', 'In place', 'O(n) time']),
  c('First Unique Character in a String', 'easy', ['Amazon', 'Bloomberg', 'Google'],
    'Return the index of the first non-repeating character in a string, or -1.\nExample: "leetcode" -> 0',
    ['Count frequencies with a hash map', 'Second pass finds the first count of 1', 'O(n) time']),

  // ---------- medium ----------
  c('Longest Substring Without Repeating Characters', 'medium', ['Amazon', 'Google', 'Meta', 'Microsoft'],
    'Return the length of the longest substring without repeating characters.\nExample: "abcabcbb" -> 3 ("abc")',
    ['Sliding window with two pointers', 'Hash map of last seen index (or a set)', 'Move the left pointer past the duplicate', 'O(n) time']),
  c('LRU Cache', 'medium', ['Amazon', 'Meta', 'Google', 'Microsoft'],
    'Design a Least Recently Used cache with a fixed capacity supporting get(key) and put(key, value), both in O(1) time. When full, evict the least recently used key.',
    ['Hash map plus doubly linked list', 'O(1) get and put', 'Move a node to the front on access', 'Evict from the tail']),
  c('Number of Islands', 'medium', ['Amazon', 'Google', 'Meta', 'Microsoft'],
    'Given a 2D grid of "1" (land) and "0" (water), count the islands (groups of land connected horizontally or vertically).',
    ['DFS or BFS flood fill', 'Mark visited cells', 'Count connected components', 'O(m*n) time', 'Union-Find alternative']),
  c('Group Anagrams', 'medium', ['Amazon', 'Meta', 'Google'],
    'Group an array of strings into lists of anagrams.\nExample: ["eat","tea","tan","ate","nat","bat"] -> [["eat","tea","ate"],["tan","nat"],["bat"]]',
    ['Hash map keyed by sorted string or character count', 'Append each word to its group', 'O(n k log k) time']),
  c('Top K Frequent Elements', 'medium', ['Amazon', 'Meta', 'Google'],
    'Return the k most frequent elements of an integer array.\nExample: [1,1,1,2,2,3], k = 2 -> [1, 2]',
    ['Count frequency with a hash map', 'Min-heap of size k', 'Bucket sort gives O(n)']),
  c('Product of Array Except Self', 'medium', ['Amazon', 'Meta', 'Apple'],
    'Return an array where each element is the product of all other elements, without using division, in O(n).\nExample: [1,2,3,4] -> [24,12,8,6]',
    ['Prefix products', 'Suffix products', 'No division', 'O(n) time, O(1) extra space besides output']),
  c('3Sum', 'medium', ['Meta', 'Amazon', 'Google'],
    'Return all unique triplets in the array that sum to zero.',
    ['Sort the array first', 'Fix one element and use two pointers', 'Skip duplicates', 'O(n^2) time']),
  c('Merge Intervals', 'medium', ['Google', 'Meta', 'Amazon'],
    'Merge all overlapping intervals.\nExample: [[1,3],[2,6],[8,10],[15,18]] -> [[1,6],[8,10],[15,18]]',
    ['Sort by start time', 'Merge when start is within previous end', 'O(n log n) time']),
  c('Course Schedule', 'medium', ['Amazon', 'Google', 'Meta'],
    'There are n courses with prerequisite pairs [a, b] meaning b must be taken before a. Can you finish all courses?',
    ['Model as a directed graph', 'Detect a cycle', 'Topological sort with Kahn BFS and in-degree', 'DFS with visiting states alternative']),
  c('Binary Tree Level Order Traversal', 'medium', ['Amazon', 'Meta', 'Microsoft'],
    'Return the node values of a binary tree level by level, left to right.',
    ['BFS with a queue', 'Process one level at a time using queue size', 'O(n) time']),
  c('Validate Binary Search Tree', 'medium', ['Amazon', 'Meta', 'Microsoft'],
    'Determine whether a binary tree is a valid binary search tree.',
    ['Recursion with min and max bounds', 'In-order traversal must be strictly increasing', 'O(n) time']),
  c('Kth Largest Element in an Array', 'medium', ['Meta', 'Amazon', 'Microsoft'],
    'Find the kth largest element in an unsorted array.',
    ['Min-heap of size k', 'Quickselect average O(n)', 'Sorting O(n log n) baseline']),
  c('Coin Change', 'medium', ['Amazon', 'Google'],
    'Given coin denominations and an amount, return the fewest coins needed to make the amount, or -1.\nExample: coins = [1,2,5], amount = 11 -> 3',
    ['Bottom-up dynamic programming', 'dp[x] = min(dp[x - coin] + 1)', 'Return -1 when unreachable', 'O(amount * coins) time']),
  c('Longest Palindromic Substring', 'medium', ['Amazon', 'Microsoft'],
    'Return the longest palindromic substring of s.\nExample: "babad" -> "bab"',
    ['Expand around each center', 'Handle odd and even length centers', 'O(n^2) time, O(1) space']),
  c('Search in Rotated Sorted Array', 'medium', ['Meta', 'Amazon', 'Microsoft'],
    'A sorted array was rotated at an unknown pivot. Find the index of target in O(log n), or -1.',
    ['Modified binary search', 'Determine which half is sorted', 'O(log n) time']),
  c('Lowest Common Ancestor of a Binary Tree', 'medium', ['Meta', 'Amazon', 'Microsoft'],
    'Given a binary tree and two nodes p and q, return their lowest common ancestor.',
    ['Recursive search in both subtrees', 'Current node is the answer when p and q are found on different sides', 'O(n) time']),
  c('Rotting Oranges', 'medium', ['Amazon', 'Google'],
    'In a grid, rotten oranges rot adjacent fresh oranges each minute. Return the minutes until no fresh orange remains, or -1.',
    ['Multi-source BFS', 'Queue all rotten oranges first', 'Count minutes by BFS levels', 'Return -1 if fresh oranges remain']),
  c('Subarray Sum Equals K', 'medium', ['Meta', 'Google'],
    'Count the continuous subarrays whose sum equals k.',
    ['Prefix sums', 'Hash map of prefix-sum counts', 'Add count of (prefix - k)', 'O(n) time']),
  c('Word Break', 'medium', ['Amazon', 'Google', 'Meta'],
    'Given a string and a dictionary, can the string be segmented into dictionary words?\nExample: "leetcode", ["leet","code"] -> true',
    ['Dynamic programming over prefixes', 'Dictionary in a hash set', 'dp[i] is true if dp[j] and s[j:i] is a word', 'O(n^2) time']),
  c('Clone Graph', 'medium', ['Meta', 'Google'],
    'Return a deep copy of a connected undirected graph.',
    ['DFS or BFS traversal', 'Hash map from original node to clone', 'Handles cycles', 'O(V + E) time']),
  c('Container With Most Water', 'medium', ['Amazon', 'Google'],
    'Given line heights, find two lines that together with the x-axis hold the most water.',
    ['Two pointers at both ends', 'Move the shorter line inward', 'O(n) time']),
  c('Meeting Rooms II', 'medium', ['Google', 'Meta', 'Amazon'],
    'Given meeting time intervals, return the minimum number of rooms required.',
    ['Sort by start time', 'Min-heap of end times', 'Or sort starts and ends separately', 'O(n log n) time']),

  // ---------- hard ----------
  c('Trapping Rain Water', 'hard', ['Amazon', 'Google', 'Meta', 'Apple'],
    'Given bar heights, compute how much rain water is trapped.\nExample: [0,1,0,2,1,0,1,3,2,1,2,1] -> 6',
    ['Water at i = min(maxLeft, maxRight) - height[i]', 'Two pointers', 'Prefix max arrays alternative', 'O(n) time, O(1) space']),
  c('Merge k Sorted Lists', 'hard', ['Amazon', 'Meta', 'Google'],
    'Merge k sorted linked lists into one sorted list.',
    ['Min-heap of list heads', 'O(N log k) time', 'Divide and conquer merging alternative']),
  c('Median of Two Sorted Arrays', 'hard', ['Google', 'Amazon', 'Microsoft'],
    'Return the median of two sorted arrays in O(log(m + n)) time.',
    ['Binary search on the partition of the smaller array', 'Max of left halves <= min of right halves', 'O(log(min(m, n))) time']),
  c('Word Ladder', 'hard', ['Amazon', 'Meta', 'Google'],
    'Return the length of the shortest transformation sequence from beginWord to endWord, changing one letter at a time, where each word must be in the word list.',
    ['BFS for shortest path', 'Generate neighbours by changing one letter', 'Word set for O(1) lookup', 'Bidirectional BFS optimisation']),
  c('Serialize and Deserialize Binary Tree', 'hard', ['Amazon', 'Meta', 'Google', 'LinkedIn'],
    'Design functions to convert a binary tree to a string and back.',
    ['Preorder DFS with null markers', 'Or BFS level order', 'Rebuild recursively from tokens', 'O(n) time']),
  c('Minimum Window Substring', 'hard', ['Meta', 'Amazon', 'Google'],
    'Return the smallest substring of s that contains all characters of t (with multiplicity).\nExample: s = "ADOBECODEBANC", t = "ABC" -> "BANC"',
    ['Sliding window with two pointers', 'Character count map of t', 'Shrink the window once all characters are covered', 'O(n) time']),
  c('Sliding Window Maximum', 'hard', ['Amazon', 'Google'],
    'Return the maximum of every window of size k sliding over the array.',
    ['Monotonic deque of indices', 'Drop out-of-window and smaller elements', 'O(n) time']),
  c('Alien Dictionary', 'hard', ['Meta', 'Google', 'Amazon'],
    'Given words sorted in an unknown alien language, derive the order of its letters.',
    ['Build a graph from adjacent word pairs', 'Topological sort', 'Detect cycles and the invalid prefix case']),
  c('Find Median from Data Stream', 'hard', ['Amazon', 'Google', 'Microsoft'],
    'Design a structure supporting addNum(x) and findMedian() over a stream of numbers.',
    ['Two heaps: max-heap for lower half, min-heap for upper half', 'Keep sizes balanced', 'O(log n) add, O(1) median']),
  c('Edit Distance', 'hard', ['Google', 'Amazon'],
    'Return the minimum number of insertions, deletions and replacements to convert word1 into word2.',
    ['2D dynamic programming', 'Insert, delete and replace transitions', 'dp[i][j] from its three neighbours', 'O(m*n) time']),
  c('Longest Increasing Path in a Matrix', 'hard', ['Google', 'Meta'],
    'Return the length of the longest strictly increasing path in a matrix (moving up, down, left or right).',
    ['DFS with memoisation', 'Each cell computed once', 'O(m*n) time']),
  c('Word Search II', 'hard', ['Amazon', 'Microsoft', 'Uber'],
    'Given a board of letters and a list of words, return all words that can be formed by adjacent cells.',
    ['Build a Trie of the words', 'DFS backtracking over the board', 'Mark visited cells', 'Prune found words from the Trie']),
];

export const SYSTEM_DESIGN = [
  { title: 'Design a URL shortener (like TinyURL / bit.ly)', companies: ['Google', 'Amazon', 'Meta'], points: ['Requirements and scale estimates', 'ID generation with base62 or hashing', 'Key-value store for mappings', 'Cache hot URLs', 'Redirect 301 vs 302 and analytics'] },
  { title: 'Design a rate limiter for an API', companies: ['Google', 'Amazon', 'Stripe'], points: ['Token bucket or sliding window algorithm', 'Distributed counters in Redis', 'Placement at the API gateway', 'Return 429 with retry headers'] },
  { title: 'Design a news feed (like Facebook or Twitter)', companies: ['Meta', 'Twitter', 'LinkedIn'], points: ['Fan-out on write vs fan-out on read', 'Hybrid approach for celebrities', 'Feed cache', 'Ranking', 'Pagination'] },
  { title: 'Design a chat application (like WhatsApp)', companies: ['Meta', 'Amazon', 'Microsoft'], points: ['WebSockets for persistent connections', 'Message storage and delivery receipts', 'Offline message queue', 'Group message fan-out', 'End-to-end encryption'] },
  { title: 'Design a video streaming platform (like YouTube or Netflix)', companies: ['Google', 'Netflix', 'Amazon'], points: ['Upload and transcoding pipeline', 'Adaptive bitrate streaming', 'CDN for delivery', 'Metadata database', 'Recommendations'] },
  { title: 'Design a ride-hailing service (like Uber)', companies: ['Uber', 'Amazon', 'Google'], points: ['Frequent driver location updates', 'Geo-indexing with geohash or quadtree', 'Matching service', 'Surge pricing', 'Trip state machine'] },
  { title: 'Design a file storage and sync service (like Google Drive or Dropbox)', companies: ['Google', 'Dropbox', 'Microsoft'], points: ['File chunking', 'Deduplication', 'Metadata service', 'Sync and conflict resolution', 'Object storage'] },
  { title: 'Design a distributed cache', companies: ['Amazon', 'Google', 'Meta'], points: ['Consistent hashing', 'LRU eviction', 'Replication', 'Cache invalidation strategies'] },
  { title: 'Design a web crawler', companies: ['Google', 'Amazon'], points: ['URL frontier queue', 'Politeness and robots.txt', 'Duplicate detection', 'Distributed workers'] },
  { title: 'Design search autocomplete (typeahead)', companies: ['Google', 'Amazon', 'LinkedIn'], points: ['Trie with top-k suggestions', 'Precompute popular queries', 'Caching', 'Offline update pipeline'] },
  { title: 'Design a notification system (push, email, SMS)', companies: ['Amazon', 'Meta', 'Apple'], points: ['Multiple channels', 'Message queues', 'Retries and de-duplication', 'User preferences and rate limits'] },
];

export const LOW_LEVEL_DESIGN = [
  { title: 'Design a parking lot system (classes and interactions)', companies: ['Amazon', 'Microsoft'], points: ['Classes: ParkingLot, Level, Spot, Vehicle, Ticket', 'Different spot types', 'Spot allocation strategy', 'Payment and exit flow'] },
  { title: 'Design an elevator system', companies: ['Amazon', 'Google'], points: ['Elevator controller', 'Request scheduling such as the SCAN algorithm', 'Elevator states', 'Handling multiple elevators'] },
];

const f = (question, points) => ({ question, points });

export const SOFTWARE_FUNDAMENTALS = [
  f('Explain the four pillars of object-oriented programming with a real example.', ['Encapsulation', 'Abstraction', 'Inheritance', 'Polymorphism', 'Concrete example']),
  f('What is the difference between a process and a thread?', ['A process has its own memory space', 'Threads share memory within a process', 'Context switching cost', 'Synchronization needs']),
  f('What is a deadlock, and how can it be prevented?', ['Mutual exclusion, hold and wait, no preemption, circular wait', 'Break one of the conditions', 'Consistent lock ordering', 'Avoidance such as the banker algorithm']),
  f('Explain database normalization and when you might denormalize.', ['1NF, 2NF, 3NF', 'Removes redundancy', 'Prevents update anomalies', 'Denormalize for read performance']),
  f('What are the ACID properties of a database transaction?', ['Atomicity', 'Consistency', 'Isolation', 'Durability', 'Example such as a bank transfer']),
  f('How does a database index work, and what are its trade-offs?', ['B-tree structure', 'Faster reads', 'Slower writes and extra storage', 'Composite index column order']),
  f('What is the difference between TCP and UDP?', ['TCP is connection-oriented, reliable and ordered', 'UDP is connectionless and faster', 'Three-way handshake', 'Use cases like streaming and DNS']),
  f('What happens when you type a URL into the browser and press Enter?', ['DNS lookup', 'TCP and TLS handshake', 'HTTP request', 'Server response', 'Browser rendering']),
  f('What is virtual memory, and how does paging work?', ['Pages and frames', 'Page table', 'Page fault', 'Illusion of a larger memory using disk']),
  f('Explain the different types of SQL joins.', ['Inner join', 'Left join', 'Right join', 'Full outer join', 'Example']),
  f('What is the difference between HTTP and HTTPS, and how does TLS work at a high level?', ['Encryption', 'Certificates', 'Handshake', 'Symmetric session keys']),
  f('Compare arrays and linked lists.', ['Contiguous memory', 'O(1) random access versus O(n)', 'Insertion and deletion cost', 'Cache locality']),
  f('What is a REST API, and what are the common HTTP methods?', ['Resources and URLs', 'GET, POST, PUT, DELETE', 'Stateless', 'Status codes']),
  f('What is Big-O notation? Give examples.', ['Asymptotic growth', 'Time and space complexity', 'Worst case', 'O(1), O(log n), O(n), O(n log n)']),
];

// Offline-mode banks for non-software domains.
export const DOMAIN_BANKS = {
  mechanical: [
    f('Explain the laws of thermodynamics with a practical engineering example.', ['Zeroth, first, second and third law', 'Energy conservation', 'Entropy', 'Practical example such as an engine or refrigerator']),
    f('What is the difference between stress and strain, and what is Young\'s modulus?', ['Stress is force per unit area', 'Strain is deformation per unit length', 'Young\'s modulus is stress over strain', 'Elastic region']),
    f('How does a four-stroke internal combustion engine work?', ['Intake', 'Compression', 'Power', 'Exhaust', 'Valve timing']),
    f('Which manufacturing processes do you know, and how would you choose between them?', ['Casting, forging, machining, welding', 'Material and volume', 'Cost and tolerance', 'Surface finish']),
  ],
  electrical: [
    f('Why is AC used for power transmission instead of DC?', ['Easy voltage transformation', 'High voltage reduces current and losses', 'Transformers', 'HVDC exceptions']),
    f('Explain how a transformer works.', ['Electromagnetic induction', 'Primary and secondary windings', 'Turns ratio', 'Losses: copper and iron']),
    f('What is a PLC and where is it used?', ['Programmable logic controller', 'Industrial automation', 'Ladder logic', 'Inputs, outputs and scan cycle']),
    f('State Ohm\'s law and Kirchhoff\'s laws with an example.', ['V = IR', 'Current law at a node', 'Voltage law in a loop', 'Worked example']),
  ],
  electronics: [
    f('Explain how a transistor works as a switch.', ['Cut-off and saturation regions', 'Base current controls collector current', 'Digital logic use', 'Example circuit']),
    f('What is the difference between a microprocessor and a microcontroller?', ['Microcontroller has on-chip memory and peripherals', 'Microprocessor needs external components', 'Use cases', 'Power and cost']),
    f('What are operational amplifiers used for?', ['High gain differential amplifier', 'Inverting and non-inverting configurations', 'Feedback', 'Filters and comparators']),
    f('Compare analog and digital signals.', ['Continuous versus discrete', 'Noise immunity', 'Sampling and quantization', 'ADC and DAC']),
  ],
  civil: [
    f('What is the difference between one-way and two-way slabs?', ['Ratio of long span to short span', 'Load transfer direction', 'Reinforcement layout', 'Typical examples']),
    f('Which tests are performed on concrete, and why?', ['Slump test for workability', 'Compressive strength cube test', 'Curing', 'Quality control']),
    f('Explain the different types of foundations and when to use each.', ['Shallow: isolated, combined, raft', 'Deep: pile foundations', 'Soil bearing capacity', 'Load']),
    f('Why is steel reinforcement used in concrete?', ['Concrete is weak in tension', 'Steel carries tensile stress', 'Similar thermal expansion', 'Bond between steel and concrete']),
  ],
  finance: [
    f('Walk me through the three financial statements and how they are linked.', ['Income statement', 'Balance sheet', 'Cash flow statement', 'Net income flows to retained earnings and cash flow']),
    f('What is working capital and why does it matter?', ['Current assets minus current liabilities', 'Liquidity', 'Operating cycle', 'Impact on cash flow']),
    f('Explain NPV and IRR, and when you would prefer one over the other.', ['Discounting future cash flows', 'NPV greater than zero creates value', 'IRR is the rate where NPV is zero', 'Mutually exclusive projects prefer NPV']),
    f('How does GST input tax credit work?', ['Tax paid on purchases', 'Set off against output tax', 'Eligibility conditions', 'Example calculation']),
  ],
  marketing: [
    f('How would you measure the success of a digital marketing campaign?', ['Clear objective and KPIs', 'CTR, conversion rate, CAC, ROAS', 'Attribution', 'A/B testing']),
    f('Explain the 4Ps of marketing with an example.', ['Product', 'Price', 'Place', 'Promotion', 'Real brand example']),
    f('What is the relationship between customer acquisition cost and lifetime value?', ['CAC definition', 'LTV definition', 'LTV to CAC ratio', 'Payback period']),
    f('How would you launch a new product in a competitive market?', ['Market research and segmentation', 'Positioning and differentiation', 'Go-to-market channels', 'Metrics']),
  ],
  general: [
    f('How do you prioritise when you have several deadlines at the same time?', ['Urgency and importance', 'Communicate with stakeholders', 'Break work into steps', 'Specific example']),
    f('Describe a process you improved and the result.', ['The original problem', 'Your analysis', 'The change you made', 'Measurable result']),
    f('How do you use data to make decisions in your field?', ['Define the question', 'Collect and analyse data', 'Tools used', 'Decision and outcome']),
    f('Explain a SWOT analysis with an example from your domain.', ['Strengths', 'Weaknesses', 'Opportunities', 'Threats', 'Concrete example']),
  ],
};

export const HR_BANK = {
  intro: f('Tell me about yourself.', ['Current role or education', 'Two or three key achievements from your CV', 'Why you are interested in this role', 'Concise, about two minutes']),
  motivation: f('Why do you want this role, and why our company?', ['Research on the company', 'Link your skills to the role', 'Career goals alignment']),
  strengths: f('What are your greatest strengths, and what is one weakness you are working on?', ['Strengths backed by evidence', 'A genuine weakness', 'Concrete steps to improve']),
  behavioral: [
    f('Tell me about a time you had a conflict with a teammate and how you resolved it.', ['Situation, Task, Action, Result structure', 'Your specific actions', 'Listening and empathy', 'Positive outcome']),
    f('Describe a failure or mistake and what you learned from it.', ['Own the mistake', 'STAR structure', 'Lesson applied later']),
    f('Tell me about a time you took ownership of something beyond your responsibilities.', ['Initiative', 'Measurable impact', 'STAR structure']),
    f('How do you handle pressure and tight deadlines? Give an example.', ['Prioritisation', 'Real example', 'Communication with others', 'Result']),
    f('Tell me about a time you had to learn something new very quickly.', ['Learning approach', 'Resources used', 'Applied result', 'STAR structure']),
  ],
  senior: [
    f('Tell me about a time you led a team through an ambiguous or difficult project.', ['Set direction and clarity', 'Delegation', 'Handling risks', 'Outcome and team growth']),
    f('How do you mentor junior engineers or team members?', ['Regular one-to-ones', 'Growth plans', 'Delegating stretch work', 'Example of someone you helped']),
    f('Describe a disagreement with a senior stakeholder and how you handled it.', ['Data-driven argument', 'Understanding their perspective', 'Disagree and commit', 'Outcome']),
  ],
  fresher: [
    f('Tell me about a college project where you worked in a team. What was your role?', ['Project goal', 'Your specific role', 'Team collaboration', 'Result and learning']),
    f('Are you open to relocation, shifts, or working on any technology the team needs?', ['Honest answer', 'Flexibility', 'Eagerness to learn']),
  ],
  experienced: [
    f('Why are you looking to change your current job?', ['Positive framing', 'Growth or learning reasons', 'No criticism of the current employer']),
    f('What are your salary expectations and notice period?', ['Researched market range', 'Flexibility', 'Clear notice period']),
  ],
  goals: f('Where do you see yourself in five years?', ['Realistic growth path', 'Alignment with the company', 'Skills you plan to build']),
  closing: f('Do you have any questions for us?', ['Thoughtful questions about the team or role', 'Shows genuine interest', 'Avoid salary-only questions']),
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export { shuffle };

/** Random pool of FAANG questions for the chosen level. */
export function pickFaangPool(level) {
  const [primary, secondary] = { beginner: ['easy', 'medium'], intermediate: ['medium', 'easy'], hard: ['hard', 'medium'] }[level];
  const coding = [
    ...shuffle(CODING_QUESTIONS.filter((q) => q.difficulty === primary)).slice(0, 7),
    ...shuffle(CODING_QUESTIONS.filter((q) => q.difficulty === secondary)).slice(0, 3),
  ];
  const design =
    level === 'beginner' ? [] : level === 'intermediate' ? shuffle([...LOW_LEVEL_DESIGN, ...SYSTEM_DESIGN]).slice(0, 4) : shuffle(SYSTEM_DESIGN).slice(0, 4);
  const fundamentals = shuffle(SOFTWARE_FUNDAMENTALS).slice(0, level === 'beginner' ? 8 : 5);
  return { coding, design, fundamentals };
}
