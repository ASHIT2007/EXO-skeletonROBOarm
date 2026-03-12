#include <Servo.h>

Servo baseServo;     // J1
Servo shoulderServo; // J2
Servo elbowServo;    // J3
Servo gripperServo;  // J4

// Pin Definitions
const int BASE_PIN = 9;
const int SHOULDER_PIN = 10;
const int ELBOW_PIN = 11;
const int GRIPPER_PIN = 6;

// Last valid positions to hold on error
int lastPos[4] = {90, 90, 90, 0};

void setup() {
  Serial.begin(9600);
  
  baseServo.attach(BASE_PIN);
  shoulderServo.attach(SHOULDER_PIN);
  elbowServo.attach(ELBOW_PIN);
  gripperServo.attach(GRIPPER_PIN);
  
  // Initial positions
  baseServo.write(lastPos[0]);
  shoulderServo.write(lastPos[1]);
  elbowServo.write(lastPos[2]);
  gripperServo.write(lastPos[3]);
  
  Serial.println("4-DOF ROBOT READY");
}

void loop() {
  if (Serial.available() > 0) {
    String data = Serial.readStringUntil('\n');
    parseAndMove(data);
  }
}

void parseAndMove(String data) {
  int values[4];
  int count = 0;
  int lastComma = -1;

  for (int i = 0; i < data.length(); i++) {
    if (data[i] == ',' || i == data.length() - 1) {
      String segment;
      if (i == data.length() - 1 && data[i] != ',') {
         segment = data.substring(lastComma + 1);
      } else {
         segment = data.substring(lastComma + 1, i);
      }
      
      values[count++] = segment.toInt();
      lastComma = i;
      if (count == 4) break;
    }
  }

  if (count == 4) {
    // Bounds checking & Write
    if (isValid(values[0])) { baseServo.write(values[0]); lastPos[0] = values[0]; }
    if (isValid(values[1])) { shoulderServo.write(values[1]); lastPos[1] = values[1]; }
    if (isValid(values[2])) { elbowServo.write(values[2]); lastPos[2] = values[2]; }
    if (isValid(values[3])) { gripperServo.write(values[3]); lastPos[3] = values[3]; }
  }
}

bool isValid(int val) {
  return val >= 0 && val <= 180;
}
