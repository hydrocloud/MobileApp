const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar, DataTable, TableHeader } from "react-mdl";

import * as view from "./view.js";
import Verify from "./Verify.js";
const network = require("./network.js");
const user = require("./user.js");

export default class MyExams extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            examDescription: ""
        };
    }

    getExamDescription(exam) {
        let totalScore = 0;

        let subjectScores = exam.subjectScores.map(v => {
            totalScore += v.score;
            return {
                subject: v.subjectName,
                score: v.score
            }
        });

        return (
            <div>
                <span style={{color: "#7F7F7F", fontSize: "14px"}}>{exam.examName}</span><br /><br />
                <DataTable
                    shadow={0}
                    rows={subjectScores}
                    style={{width: "100%"}}
                >
                    <TableHeader name="subject">科目</TableHeader>
                    <TableHeader numeric name="score">总分</TableHeader>
                </DataTable><br />
                <p style={{color: "#7F7F7F", fontSize: "14px"}}>
                    <span>{subjectScores.length} 门科目的总分: {totalScore}</span><br />
                    <span>请登录智学网 (www.zhixue.com) 查看详情。</span>
                </p>
                <br />
            </div>
        )
    }

    async loadExamDescription() {
        this.setState({
            examDescription: (
                <ProgressBar indeterminate />
            )
        });

        let exams = JSON.parse(await network.makeRequest("POST", "/api/student/exams"));

        this.setState({
            examDescription: ""
        });

        if(exams.err !== 0) {
            throw exams;
        }

        exams = exams.exams;

        if(exams.length == 0) {
            throw "No exams";
        }

        let lastExam = exams[exams.length - 1];
        let desc = this.getExamDescription(lastExam);
        this.setState({
            examDescription: desc
        });
    }

    async componentDidMount() {
        this.setState({
            examDescription: (
                <Button colored raised onClick={() => this.loadExamDescription()}>展开</Button>
            )
        })
    }

    render() {
        return (
            <Card shadow={0} className="main-card">
                <h3>最近考试</h3>
                <div>{this.state.examDescription}</div>
            </Card>
        )
    }
}