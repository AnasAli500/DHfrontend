export const calculatePercentage = (marks, totalMarks) => {
  if (!totalMarks || totalMarks <= 0) return 0;
  return Math.round((marks / totalMarks) * 100);
};

export const calculateGrade = (percentage) => {
  if (percentage >= 95) return 'A+';
  if (percentage >= 90) return 'A';
  if (percentage >= 85) return 'A-';
  if (percentage >= 80) return 'B+';
  if (percentage >= 75) return 'B';
  if (percentage >= 70) return 'B-';
  if (percentage >= 65) return 'C+';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'C-';
  if (percentage >= 40) return 'D';
  if (percentage >= 20) return 'E';
  return 'F';
};

export const calculateGPA = (percentage) => {
  if (percentage >= 95) return 4.0;
  if (percentage >= 90) return 3.9;
  if (percentage >= 85) return 3.7;
  if (percentage >= 80) return 3.5;
  if (percentage >= 75) return 3.0;
  if (percentage >= 70) return 2.7;
  if (percentage >= 65) return 2.3;
  if (percentage >= 60) return 2.0;
  if (percentage >= 50) return 1.5;
  if (percentage >= 40) return 1.0;
  if (percentage >= 20) return 0.5;
  return 0.0;
};
