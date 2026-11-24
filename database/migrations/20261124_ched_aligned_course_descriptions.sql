-- Concise, locally written CHED-aligned catalog descriptions (not copied syllabus text).
-- Fill only blank descriptions so any later registrar-authored copy is preserved.
UPDATE courses
SET description = CASE course_code
  WHEN 'COSC 100' THEN 'Studies formal languages, grammars, finite automata, and related models of computation. Students use these foundations to reason about language recognition and computational limits.'
  WHEN 'COSC 101' THEN 'Introduces computer graphics and visual computing, including geometric transformations, image representation, modeling, and rendering. Students apply these techniques to create and evaluate visual computing applications.'
  WHEN 'COSC 105' THEN 'Explores intelligent systems and core artificial intelligence methods such as search, knowledge representation, reasoning, and learning. Students analyze where these methods are useful and their limitations.'
  WHEN 'COSC 111' THEN 'Introduces Internet of Things architectures built from connected devices, sensors, software, and services. Students examine communication protocols, data flows, practical applications, and security considerations.'
  WHEN 'COSC 200A' THEN 'Develops a computer science research proposal through problem definition, literature review, objectives, and a defensible research methodology. Students plan the work and present a proposal for an original, technically grounded study.'
  WHEN 'COSC 50' THEN 'Builds mathematical foundations for computer science through logic, sets, relations, functions, proof techniques, counting, and introductory graph concepts. Students use these structures to express and analyze computing problems.'
  WHEN 'COSC 55' THEN 'Extends discrete mathematics with proof methods, recurrence relations, combinatorics, graphs, and trees. Students apply these topics to model and analyze algorithms and computational structures.'
  WHEN 'COSC 60' THEN 'Introduces digital logic through Boolean algebra, number systems, logic gates, and combinational and sequential circuits. Students design and analyze the basic digital components used in computing systems.'
  WHEN 'COSC 75' THEN 'Applies software engineering practices to the design and delivery of larger software systems. Topics include architecture, implementation, verification, quality, maintenance, and coordinated project work.'
  WHEN 'COSC 80' THEN 'Examines operating-system services and their management of processes, concurrency, memory, files, storage, and devices. Students relate these mechanisms to system performance, reliability, and security.'
  WHEN 'COSC 85' THEN 'Covers computer communication concepts, network models, protocols, addressing, routing, and common network services. Students develop a foundation for analyzing, configuring, and troubleshooting networked systems.'
  WHEN 'CvSU 101' THEN 'Introduces EduTrack University, its mission, vision, values, academic policies, student services, and community responsibilities. Students learn how to participate effectively in university life.'
  WHEN 'DCIT 21' THEN 'Introduces computing, its history and impact, computer systems and infrastructure, basic security, the Internet and web, and applications across fields. Students gain context for later study in information technology and computer science.'
  WHEN 'DCIT 22' THEN 'Introduces algorithms and structured programming using fundamental data types, expressions, decisions, repetition, and modular program design. Students write, test, debug, and explain programs that solve defined problems.'
  WHEN 'DCIT 24' THEN 'Introduces information management and database systems, including data modeling, relational database design, SQL, data integrity, and basic database operations. Students organize and retrieve data for practical applications.'
  WHEN 'DCIT 26' THEN 'Introduces the development of applications using current and emerging technologies, with attention to requirements, design, implementation, testing, and deployment. Students consider usability, security, and professional responsibilities in application work.'
  WHEN 'DCIT 50' THEN 'Teaches object-oriented programming using classes and objects, encapsulation, abstraction, inheritance, and polymorphism. Students design and implement reusable programs using object-oriented problem-solving.'
  WHEN 'DCIT 60' THEN 'Introduces research methods for computing and information technology, including problem formulation, literature review, research design, data gathering and analysis, ethics, and technical writing.'
  WHEN 'DCIT 65' THEN 'Examines professional, ethical, legal, and social issues in computing. Students consider privacy, intellectual property, security, responsible conduct, and technology’s effects on individuals and communities.'
  WHEN 'FITT 1' THEN 'Develops physical literacy through fundamental movement skills and participation in physical activity. Students build awareness of safe movement, personal fitness, and active-living habits.'
  WHEN 'FITT 3' THEN 'Promotes health-related fitness through structured physical activities and exercise. Students practice safe participation and develop routines that support lifelong physical well-being.'
  WHEN 'GNED 02' THEN 'Introduces ethical concepts, frameworks, and reasoning. Students examine moral questions and apply reasoned ethical judgment to personal, professional, and social situations.'
  WHEN 'GNED 04' THEN 'Examines Philippine history through primary and secondary sources, historical interpretation, and significant events and institutions. Students connect historical developments with contemporary Filipino society and identity.'
  WHEN 'GNED 05' THEN 'Develops oral, written, and multimodal communication for academic, professional, and civic settings. Students practice audience-aware, clear, organized, and responsible communication across contexts.'
  WHEN 'GNED 07' THEN 'Introduces visual and performing arts and ways of understanding and appreciating artistic works. Students interpret art in its formal, historical, cultural, and social contexts.'
  WHEN 'GNED 10' THEN 'Examines gender concepts and how gender interacts with culture, institutions, identity, power, and social life. Students analyze gender-related issues and principles of equity and human rights.'
  WHEN 'GNED 11' THEN 'Develops Filipino communication skills through contextualized academic, professional, and community tasks. Students use Filipino appropriately while examining its relationship to culture and society.'
  WHEN 'GNED 12' THEN 'Explores concepts, knowledge, and critical inquiry expressed through and in Filipino. Students examine Filipino intellectual traditions, language, and discourse in local and broader contexts.'
  WHEN 'INSY 50' THEN 'Introduces information systems as coordinated people, processes, data, and technologies that support organizational work. Students examine system components, business needs, responsible use, and basic security.'
  WHEN 'INSY 55' THEN 'Covers the analysis and design of information systems, from stakeholder needs and requirements to process and data models and proposed solutions. Students document, validate, and communicate system designs.'
  WHEN 'ITEC 110' THEN 'Covers the administration and maintenance of computing systems, including operating-system configuration, user and service management, deployment, monitoring, backup, troubleshooting, and security practices.'
  WHEN 'ITEC 111' THEN 'Applies integrated programming and technology tools to build software solutions from connected components. Students work with APIs and frameworks and address data exchange, testing, and deployment.'
  WHEN 'ITEC 116' THEN 'Examines systems integration and architecture, including component boundaries, interfaces, APIs, and interoperability standards. Students design and assess integrated solutions for reliability, security, and maintainability.'
  WHEN 'ITEC 200B' THEN 'Completes an applied information technology capstone by implementing, testing, evaluating, and documenting a solution to a relevant problem. Students present the finished work and explain its design, evidence, and results.'
  WHEN 'ITEC 55' THEN 'Introduces computing platforms, including hardware, operating systems, development tools, and related services. Students compare platform capabilities and configure technologies for compatibility and practical use.'
  WHEN 'ITEC 80' THEN 'Introduces human-computer interaction through user needs, interaction design, prototyping, accessibility, and usability evaluation. Students apply user-centered methods to improve digital interfaces.'
  WHEN 'ITEC 85' THEN 'Introduces information assurance and security principles, common threats and vulnerabilities, risk, and protective controls. Students consider authentication, policy, safe practices, and incident response.'
  WHEN 'ITEC 90' THEN 'Introduces network fundamentals including network models, media and devices, addressing and subnetting, and local and wide-area networks. Students practice basic configuration and systematic connectivity troubleshooting.'
  WHEN 'MATH 1' THEN 'Develops analytic geometry through coordinate methods for lines, conic sections, and related geometric relationships. Students use algebraic representations to solve and interpret geometric problems.'
  WHEN 'MATH 3' THEN 'Introduces linear algebra through vectors, matrices, systems of linear equations, vector spaces, and linear transformations. Students apply these tools to mathematical and computing problems.'
  WHEN 'NSTP 1' THEN 'Introduces civic responsibility, citizenship, community engagement, and service as foundations for national development. Students learn the objectives and service orientation of the NSTP component offered by the institution.'
  ELSE description
END
WHERE course_code IN (
  'COSC 100', 'COSC 101', 'COSC 105', 'COSC 111', 'COSC 200A', 'COSC 50', 'COSC 55', 'COSC 60', 'COSC 75', 'COSC 80', 'COSC 85',
  'CvSU 101', 'DCIT 21', 'DCIT 22', 'DCIT 24', 'DCIT 26', 'DCIT 50', 'DCIT 60', 'DCIT 65',
  'FITT 1', 'FITT 3', 'GNED 02', 'GNED 04', 'GNED 05', 'GNED 07', 'GNED 10', 'GNED 11', 'GNED 12',
  'INSY 50', 'INSY 55', 'ITEC 110', 'ITEC 111', 'ITEC 116', 'ITEC 200B', 'ITEC 55', 'ITEC 80', 'ITEC 85', 'ITEC 90',
  'MATH 1', 'MATH 3', 'NSTP 1'
)
AND (description IS NULL OR TRIM(description) = '');
