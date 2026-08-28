export const calculatePercentage = (marks, totalMarks) => {
  if (!totalMarks || totalMarks <= 0) return 0;
  return Math.round((marks / totalMarks) * 100);
};

export const calculateGrade = (percentage) => {
  const pct = Number(percentage) || 0;
  if (pct >= 95) return 'A+';
  if (pct >= 90) return 'A';
  if (pct >= 85) return 'A-';
  if (pct >= 80) return 'B+';
  if (pct >= 75) return 'B';
  if (pct >= 70) return 'B-';
  if (pct >= 65) return 'C+';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'C-';
  if (pct >= 45) return 'D+';
  if (pct >= 40) return 'D';
  if (pct >= 30) return 'D-';
  return 'F';
};

export const PASSING_GRADES = new Set(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-']);

export const isGradePassed = (grade) => {
  if (!grade) return false;
  return PASSING_GRADES.has(String(grade).trim().toUpperCase());
};

export const isPercentagePassed = (percentage) => {
  if (percentage === undefined || percentage === null) return false;
  return Number(percentage) >= 50;
};

export const calculateGPA = (percentage) => {
  const pct = Number(percentage) || 0;
  if (pct >= 95) return 4.0;
  if (pct >= 90) return 3.9;
  if (pct >= 85) return 3.7;
  if (pct >= 80) return 3.5;
  if (pct >= 75) return 3.0;
  if (pct >= 70) return 2.7;
  if (pct >= 65) return 2.3;
  if (pct >= 60) return 2.0;
  if (pct >= 50) return 1.5;
  if (pct >= 45) return 1.2;
  if (pct >= 40) return 1.0;
  if (pct >= 30) return 0.5;
  return 0.0;
};

